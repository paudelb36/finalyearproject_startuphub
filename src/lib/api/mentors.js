import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Get all mentors with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Array} Array of mentors
 */
export async function getMentors(filters = {}) {
  try {
    let query = supabase
      .from('mentor_profiles')
      .select(`
        *,
        profiles!mentor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)

    // Apply filters
    if (filters.expertise) {
      query = query.contains('expertise_tags', [filters.expertise])
    }
    
    if (filters.availability) {
      query = query.eq('availability', filters.availability)
    }
    
    if (filters.isPaid !== undefined) {
      query = query.eq('is_paid', filters.isPaid)
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    
    if (filters.search) {
      query = query.or(`
        bio.ilike.%${filters.search}%,
        expertise_tags.cs.{"${filters.search}"}
      `)
    }
    
    if (filters.maxRate && filters.maxRate > 0) {
      query = query.or(`is_paid.eq.false,hourly_rate.lte.${filters.maxRate}`)
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
    console.error('Error getting mentors:', error)
    return []
  }
}

/**
 * Get mentor by ID
 * @param {string} mentorId - Mentor ID
 * @returns {Object|null} Mentor data or null
 */
export async function getMentorById(mentorId) {
  try {
    const { data, error } = await supabase
      .from('mentor_profiles')
      .select(`
        *,
        profiles!mentor_profiles_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('id', mentorId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting mentor by ID:', error)
    return null
  }
}

/**
 * Create mentor profile
 * @param {Object} mentorData - Mentor data
 * @returns {Object} Result object
 */
export async function createMentorProfile(mentorData) {
  try {
    const authResult = await requireAuth(['mentor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user, profile } = authResult

    // Check if user already has a mentor profile
    const { data: existing } = await supabase
      .from('mentor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return { error: 'User already has a mentor profile', status: 400 }
    }

    const { data, error } = await supabase
      .from('mentor_profiles')
      .insert({
        user_id: user.id,
        ...mentorData
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'mentor_profile_created', { mentor_id: data.id })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating mentor profile:', error)
    return { error: 'Failed to create mentor profile', status: 500 }
  }
}

/**
 * Update mentor profile
 * @param {string} mentorId - Mentor ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Result object
 */
export async function updateMentorProfile(mentorId, updates) {
  try {
    const authResult = await requireAuth(['mentor', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership (unless admin)
    if (authResult.profile.role !== 'admin') {
      const { data: mentor } = await supabase
        .from('mentor_profiles')
        .select('user_id')
        .eq('id', mentorId)
        .single()

      if (!mentor || mentor.user_id !== user.id) {
        return { error: 'Unauthorized', status: 403 }
      }
    }

    const { data, error } = await supabase
      .from('mentor_profiles')
      .update(updates)
      .eq('id', mentorId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'mentor_profile_updated', { mentor_id: mentorId })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error updating mentor profile:', error)
    return { error: 'Failed to update mentor profile', status: 500 }
  }
}

/**
 * Send mentorship request
 * @param {string} mentorId - Mentor ID
 * @param {Object} requestData - Request data
 * @returns {Object} Result object
 */
export async function sendMentorshipRequest(mentorId, requestData) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check if request already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .eq('requester_id', user.id)
      .eq('target_id', mentorId)
      .eq('connection_type', 'mentorship_request')
      .single()

    if (existing) {
      return { error: 'Mentorship request already exists', status: 400 }
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        target_id: mentorId,
        connection_type: 'mentorship_request',
        message: requestData.message,
        status: 'pending',
        metadata: {
          session_type: requestData.session_type,
          preferred_schedule: requestData.preferred_schedule,
          goals: requestData.goals
        }
      })
      .select()
      .single()

    if (error) throw error

    // Get mentor user ID
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('user_id')
      .eq('id', mentorId)
      .single()

    if (mentor) {
      // Send notification to mentor
      await sendNotification(mentor.user_id, {
        type: 'mentorship_request',
        title: 'New Mentorship Request',
        message: `You have a new mentorship request`,
        metadata: { connection_id: data.id, requester_id: user.id }
      })
    }

    // Log activity
    await logActivity(user.id, 'mentorship_request_sent', { 
      mentor_id: mentorId,
      connection_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error sending mentorship request:', error)
    return { error: 'Failed to send mentorship request', status: 500 }
  }
}

/**
 * Respond to mentorship request
 * @param {string} connectionId - Connection ID
 * @param {string} response - 'accepted' or 'declined'
 * @param {string} message - Response message
 * @returns {Object} Result object
 */
export async function respondToMentorshipRequest(connectionId, response, message = '') {
  try {
    const authResult = await requireAuth(['mentor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get connection details
    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (!connection) {
      return { error: 'Connection not found', status: 404 }
    }

    // Check if user is the target (mentor)
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('user_id')
      .eq('id', connection.target_id)
      .single()

    if (!mentor || mentor.user_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    // Update connection status
    const { data, error } = await supabase
      .from('connections')
      .update({
        status: response,
        response_message: message,
        responded_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) throw error

    // Send notification to requester
    await sendNotification(connection.requester_id, {
      type: 'mentorship_response',
      title: `Mentorship Request ${response === 'accepted' ? 'Accepted' : 'Declined'}`,
      message: `Your mentorship request has been ${response}`,
      metadata: { connection_id: connectionId, mentor_id: connection.target_id }
    })

    // Log activity
    await logActivity(user.id, `mentorship_request_${response}`, { 
      connection_id: connectionId,
      requester_id: connection.requester_id
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error responding to mentorship request:', error)
    return { error: 'Failed to respond to mentorship request', status: 500 }
  }
}

/**
 * Get mentor's mentorship requests
 * @param {string} mentorId - Mentor ID
 * @param {string} status - Request status filter
 * @returns {Array} Array of mentorship requests
 */
export async function getMentorshipRequests(mentorId, status = null) {
  try {
    let query = supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('target_id', mentorId)
      .eq('connection_type', 'mentorship_request')

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting mentorship requests:', error)
    return []
  }
}

/**
 * Get mentor statistics
 * @param {string} mentorId - Mentor ID
 * @returns {Object} Mentor statistics
 */
export async function getMentorStats(mentorId) {
  try {
    const [requestsResult, acceptedResult, viewsResult] = await Promise.all([
      supabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('target_id', mentorId)
        .eq('connection_type', 'mentorship_request'),
      
      supabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('target_id', mentorId)
        .eq('connection_type', 'mentorship_request')
        .eq('status', 'accepted'),
      
      supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('profile_id', mentorId)
        .eq('profile_type', 'mentor')
    ])

    return {
      totalRequests: requestsResult.count || 0,
      acceptedRequests: acceptedResult.count || 0,
      views: viewsResult.count || 0,
      acceptanceRate: requestsResult.count > 0 
        ? Math.round((acceptedResult.count / requestsResult.count) * 100) 
        : 0
    }
  } catch (error) {
    console.error('Error getting mentor stats:', error)
    return {
      totalRequests: 0,
      acceptedRequests: 0,
      views: 0,
      acceptanceRate: 0
    }
  }
}

/**
 * Search mentors with advanced filters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Search results with pagination
 */
export async function searchMentors(searchParams) {
  try {
    const {
      query = '',
      expertise = [],
      availability,
      isPaid,
      maxRate,
      location,
      page = 1,
      limit = 12
    } = searchParams

    const offset = (page - 1) * limit

    let supabaseQuery = supabase
      .from('mentor_profiles')
      .select(`
        *,
        profiles!mentor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Text search
    if (query) {
      supabaseQuery = supabaseQuery.or(`
        bio.ilike.%${query}%,
        expertise_tags.cs.{"${query}"}
      `)
    }

    // Filters
    if (expertise.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('expertise_tags', expertise)
    }

    if (availability) {
      supabaseQuery = supabaseQuery.eq('availability', availability)
    }

    if (isPaid !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_paid', isPaid)
    }

    if (location) {
      supabaseQuery = supabaseQuery.ilike('location', `%${location}%`)
    }

    if (maxRate && maxRate > 0) {
      supabaseQuery = supabaseQuery.or(`is_paid.eq.false,hourly_rate.lte.${maxRate}`)
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
    console.error('Error searching mentors:', error)
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
 * Book mentorship session
 * @param {string} mentorId - Mentor ID
 * @param {Object} sessionData - Session booking data
 * @returns {Object} Result object
 */
export async function bookMentorshipSession(mentorId, sessionData) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check if mentor exists and is available
    const { data: mentor } = await supabase
      .from('mentor_profiles')
      .select('*')
      .eq('id', mentorId)
      .single()

    if (!mentor) {
      return { error: 'Mentor not found', status: 404 }
    }

    if (mentor.availability !== 'available') {
      return { error: 'Mentor is not available for booking', status: 400 }
    }

    // Create session booking
    const { data, error } = await supabase
      .from('mentorship_sessions')
      .insert({
        mentor_id: mentorId,
        mentee_id: user.id,
        scheduled_at: sessionData.scheduled_at,
        duration_minutes: sessionData.duration_minutes || 60,
        session_type: sessionData.session_type || 'video_call',
        notes: sessionData.notes,
        status: 'scheduled'
      })
      .select()
      .single()

    if (error) throw error

    // Get mentor user ID for notification
    const { data: mentorProfile } = await supabase
      .from('mentor_profiles')
      .select('user_id')
      .eq('id', mentorId)
      .single()

    if (mentorProfile) {
      // Send notification to mentor
      await sendNotification(mentorProfile.user_id, {
        type: 'session_booked',
        title: 'New Session Booked',
        message: `A new mentorship session has been booked`,
        metadata: { session_id: data.id, mentee_id: user.id }
      })
    }

    // Log activity
    await logActivity(user.id, 'mentorship_session_booked', { 
      mentor_id: mentorId,
      session_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error booking mentorship session:', error)
    return { error: 'Failed to book mentorship session', status: 500 }
  }
}