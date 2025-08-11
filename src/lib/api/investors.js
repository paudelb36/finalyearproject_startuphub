import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Get all investors with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Array} Array of investors
 */
export async function getInvestors(filters = {}) {
  try {
    let query = supabase
      .from('investor_profiles')
      .select(`
        *,
        profiles!investor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)

    // Apply filters
    if (filters.investmentStage) {
      query = query.contains('investment_stages', [filters.investmentStage])
    }
    
    if (filters.sector) {
      query = query.contains('sectors', [filters.sector])
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    
    if (filters.minTicketSize) {
      query = query.gte('min_ticket_size', filters.minTicketSize)
    }
    
    if (filters.maxTicketSize) {
      query = query.lte('max_ticket_size', filters.maxTicketSize)
    }
    
    if (filters.search) {
      query = query.or(`
        bio.ilike.%${filters.search}%,
        investment_focus.ilike.%${filters.search}%,
        sectors.cs.{"${filters.search}"}
      `)
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting investors:', error)
    return []
  }
}

/**
 * Get investor by ID
 * @param {string} investorId - Investor ID
 * @returns {Object|null} Investor data or null
 */
export async function getInvestorById(investorId) {
  try {
    const { data, error } = await supabase
      .from('investor_profiles')
      .select(`
        *,
        profiles!investor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('id', investorId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting investor by ID:', error)
    return null
  }
}

/**
 * Create investor profile
 * @param {Object} investorData - Investor data
 * @returns {Object} Result object
 */
export async function createInvestorProfile(investorData) {
  try {
    const authResult = await requireAuth(['investor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user, profile } = authResult

    // Check if user already has an investor profile
    const { data: existing } = await supabase
      .from('investor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return { error: 'User already has an investor profile', status: 400 }
    }

    const { data, error } = await supabase
      .from('investor_profiles')
      .insert({
        user_id: user.id,
        ...investorData
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'investor_profile_created', { investor_id: data.id })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating investor profile:', error)
    return { error: 'Failed to create investor profile', status: 500 }
  }
}

/**
 * Update investor profile
 * @param {string} investorId - Investor ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Result object
 */
export async function updateInvestorProfile(investorId, updates) {
  try {
    const authResult = await requireAuth(['investor', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership (unless admin)
    if (authResult.profile.role !== 'admin') {
      const { data: investor } = await supabase
        .from('investor_profiles')
        .select('user_id')
        .eq('id', investorId)
        .single()

      if (!investor || investor.user_id !== user.id) {
        return { error: 'Unauthorized', status: 403 }
      }
    }

    const { data, error } = await supabase
      .from('investor_profiles')
      .update(updates)
      .eq('id', investorId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'investor_profile_updated', { investor_id: investorId })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error updating investor profile:', error)
    return { error: 'Failed to update investor profile', status: 500 }
  }
}

/**
 * Send investment inquiry to startup
 * @param {string} startupId - Startup ID
 * @param {Object} inquiryData - Inquiry data
 * @returns {Object} Result object
 */
export async function sendInvestmentInquiry(startupId, inquiryData) {
  try {
    const authResult = await requireAuth(['investor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get investor profile
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!investorProfile) {
      return { error: 'Investor profile not found', status: 404 }
    }

    // Check if inquiry already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .eq('requester_id', investorProfile.id)
      .eq('target_id', startupId)
      .eq('connection_type', 'investment_inquiry')
      .single()

    if (existing) {
      return { error: 'Investment inquiry already exists', status: 400 }
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: investorProfile.id,
        target_id: startupId,
        connection_type: 'investment_inquiry',
        message: inquiryData.message,
        status: 'pending',
        metadata: {
          investment_amount: inquiryData.investment_amount,
          investment_terms: inquiryData.investment_terms,
          due_diligence_requirements: inquiryData.due_diligence_requirements
        }
      })
      .select()
      .single()

    if (error) throw error

    // Get startup user ID
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('user_id')
      .eq('id', startupId)
      .single()

    if (startup) {
      // Send notification to startup
      await sendNotification(startup.user_id, {
        type: 'investment_inquiry',
        title: 'New Investment Inquiry',
        message: `You have received an investment inquiry`,
        metadata: { connection_id: data.id, investor_id: investorProfile.id }
      })
    }

    // Log activity
    await logActivity(user.id, 'investment_inquiry_sent', { 
      startup_id: startupId,
      connection_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error sending investment inquiry:', error)
    return { error: 'Failed to send investment inquiry', status: 500 }
  }
}

/**
 * Get investor's investment inquiries
 * @param {string} investorId - Investor ID
 * @param {string} status - Inquiry status filter
 * @returns {Array} Array of investment inquiries
 */
export async function getInvestmentInquiries(investorId, status = null) {
  try {
    let query = supabase
      .from('connections')
      .select(`
        *,
        target:startup_profiles!connections_target_id_fkey(
          id,
          company_name,
          tagline,
          logo_url,
          stage,
          industry
        )
      `)
      .eq('requester_id', investorId)
      .eq('connection_type', 'investment_inquiry')

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting investment inquiries:', error)
    return []
  }
}

/**
 * Create pitch event
 * @param {Object} eventData - Event data
 * @returns {Object} Result object
 */
export async function createPitchEvent(eventData) {
  try {
    const authResult = await requireAuth(['investor', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        event_type: 'pitch',
        ...eventData
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'pitch_event_created', { event_id: data.id })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating pitch event:', error)
    return { error: 'Failed to create pitch event', status: 500 }
  }
}

/**
 * Get pitch event applications
 * @param {string} eventId - Event ID
 * @returns {Array} Array of applications
 */
export async function getPitchEventApplications(eventId) {
  try {
    const authResult = await requireAuth(['investor', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check if user is the event organizer
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .single()

    if (!event || (event.organizer_id !== user.id && authResult.profile.role !== 'admin')) {
      return { error: 'Unauthorized', status: 403 }
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        startup:startup_profiles!event_registrations_startup_id_fkey(
          id,
          company_name,
          tagline,
          logo_url,
          stage,
          industry,
          pitch_deck_url
        )
      `)
      .eq('event_id', eventId)
      .eq('registration_type', 'pitch_application')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting pitch event applications:', error)
    return []
  }
}

/**
 * Review pitch application
 * @param {string} applicationId - Application ID
 * @param {string} status - Review status ('accepted', 'rejected')
 * @param {string} feedback - Review feedback
 * @returns {Object} Result object
 */
export async function reviewPitchApplication(applicationId, status, feedback = '') {
  try {
    const authResult = await requireAuth(['investor', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get application details
    const { data: application } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:events!event_registrations_event_id_fkey(
          organizer_id
        )
      `)
      .eq('id', applicationId)
      .single()

    if (!application) {
      return { error: 'Application not found', status: 404 }
    }

    // Check if user is the event organizer
    if (application.event.organizer_id !== user.id && authResult.profile.role !== 'admin') {
      return { error: 'Unauthorized', status: 403 }
    }

    // Update application status
    const { data, error } = await supabase
      .from('event_registrations')
      .update({
        status,
        review_feedback: feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error

    // Get startup user ID for notification
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('user_id')
      .eq('id', application.startup_id)
      .single()

    if (startup) {
      // Send notification to startup
      await sendNotification(startup.user_id, {
        type: 'pitch_application_reviewed',
        title: `Pitch Application ${status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: `Your pitch application has been ${status}`,
        metadata: { 
          application_id: applicationId, 
          event_id: application.event_id,
          status 
        }
      })
    }

    // Log activity
    await logActivity(user.id, `pitch_application_${status}`, { 
      application_id: applicationId,
      startup_id: application.startup_id
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error reviewing pitch application:', error)
    return { error: 'Failed to review pitch application', status: 500 }
  }
}

/**
 * Get investor statistics
 * @param {string} investorId - Investor ID
 * @returns {Object} Investor statistics
 */
export async function getInvestorStats(investorId) {
  try {
    const [inquiriesResult, eventsResult, viewsResult] = await Promise.all([
      supabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('requester_id', investorId)
        .eq('connection_type', 'investment_inquiry'),
      
      supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('organizer_id', investorId)
        .eq('event_type', 'pitch'),
      
      supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('profile_id', investorId)
        .eq('profile_type', 'investor')
    ])

    return {
      inquiriesSent: inquiriesResult.count || 0,
      eventsCreated: eventsResult.count || 0,
      views: viewsResult.count || 0
    }
  } catch (error) {
    console.error('Error getting investor stats:', error)
    return {
      inquiriesSent: 0,
      eventsCreated: 0,
      views: 0
    }
  }
}

/**
 * Search investors with advanced filters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Search results with pagination
 */
export async function searchInvestors(searchParams) {
  try {
    const {
      query = '',
      sectors = [],
      investmentStages = [],
      location,
      minTicketSize,
      maxTicketSize,
      page = 1,
      limit = 12
    } = searchParams

    const offset = (page - 1) * limit

    let supabaseQuery = supabase
      .from('investor_profiles')
      .select(`
        *,
        profiles!investor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Text search
    if (query) {
      supabaseQuery = supabaseQuery.or(`
        bio.ilike.%${query}%,
        investment_focus.ilike.%${query}%,
        sectors.cs.{"${query}"}
      `)
    }

    // Filters
    if (sectors.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('sectors', sectors)
    }

    if (investmentStages.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('investment_stages', investmentStages)
    }

    if (location) {
      supabaseQuery = supabaseQuery.ilike('location', `%${location}%`)
    }

    if (minTicketSize) {
      supabaseQuery = supabaseQuery.gte('min_ticket_size', minTicketSize)
    }

    if (maxTicketSize) {
      supabaseQuery = supabaseQuery.lte('max_ticket_size', maxTicketSize)
    }

    const { data, error, count } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Error searching investors:', error)
    return {
      data: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0
      }
    }
  }
}

/**
 * Get recommended startups for investor
 * @param {string} investorId - Investor ID
 * @param {number} limit - Number of recommendations
 * @returns {Array} Array of recommended startups
 */
export async function getRecommendedStartups(investorId, limit = 10) {
  try {
    // Get investor preferences
    const { data: investor } = await supabase
      .from('investor_profiles')
      .select('sectors, investment_stages, min_ticket_size, max_ticket_size')
      .eq('id', investorId)
      .single()

    if (!investor) {
      return []
    }

    let query = supabase
      .from('startup_profiles')
      .select(`
        *,
        profiles!startup_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .limit(limit)

    // Filter by investor preferences
    if (investor.sectors && investor.sectors.length > 0) {
      query = query.in('industry', investor.sectors)
    }

    if (investor.investment_stages && investor.investment_stages.length > 0) {
      query = query.in('stage', investor.investment_stages)
    }

    if (investor.min_ticket_size) {
      query = query.gte('funding_goal', investor.min_ticket_size)
    }

    if (investor.max_ticket_size) {
      query = query.lte('funding_goal', investor.max_ticket_size)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting recommended startups:', error)
    return []
  }
}