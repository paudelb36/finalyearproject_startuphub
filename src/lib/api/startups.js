import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Get all startups with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Array} Array of startups
 */
export async function getStartups(filters = {}) {
  try {
    let query = supabase
      .from('startup_profiles')
      .select(`
        *,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url
        )
      `)

    // Apply filters
    if (filters.industry) {
      query = query.eq('industry', filters.industry)
    }
    
    if (filters.stage) {
      query = query.eq('stage', filters.stage)
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    
    if (filters.search) {
      query = query.or(`
        company_name.ilike.%${filters.search}%,
        tagline.ilike.%${filters.search}%,
        description.ilike.%${filters.search}%
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
    console.error('Error getting startups:', error)
    return []
  }
}

/**
 * Get startup by slug
 * @param {string} slug - Startup slug
 * @returns {Object|null} Startup data or null
 */
export async function getStartupBySlug(slug) {
  try {
    const { data, error } = await supabase
      .from('startup_profiles')
      .select(`
        *,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url
        ),
        startup_updates(
          id,
          title,
          content,
          image_url,
          created_at
        )
      `)
      .eq('slug', slug)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting startup by slug:', error)
    return null
  }
}

/**
 * Create startup profile
 * @param {Object} startupData - Startup data
 * @returns {Object} Result object
 */
export async function createStartupProfile(startupData) {
  try {
    const authResult = await requireAuth(['startup'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user, profile } = authResult

    // Check if user already has a startup profile
    const { data: existing } = await supabase
      .from('startup_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return { error: 'User already has a startup profile', status: 400 }
    }

    // Generate slug from company name
    const slug = startupData.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug is unique
    const { data: slugExists } = await supabase
      .from('startup_profiles')
      .select('id')
      .eq('slug', slug)
      .single()

    if (slugExists) {
      return { error: 'Company name already exists', status: 400 }
    }

    const { data, error } = await supabase
      .from('startup_profiles')
      .insert({
        user_id: user.id,
        slug,
        ...startupData
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'startup_profile_created', { startup_id: data.id })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating startup profile:', error)
    return { error: 'Failed to create startup profile', status: 500 }
  }
}

/**
 * Update startup profile
 * @param {string} startupId - Startup ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Result object
 */
export async function updateStartupProfile(startupId, updates) {
  try {
    const authResult = await requireAuth(['startup', 'admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership (unless admin)
    if (authResult.profile.role !== 'admin') {
      const { data: startup } = await supabase
        .from('startup_profiles')
        .select('user_id')
        .eq('id', startupId)
        .single()

      if (!startup || startup.user_id !== user.id) {
        return { error: 'Unauthorized', status: 403 }
      }
    }

    const { data, error } = await supabase
      .from('startup_profiles')
      .update(updates)
      .eq('id', startupId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'startup_profile_updated', { startup_id: startupId })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error updating startup profile:', error)
    return { error: 'Failed to update startup profile', status: 500 }
  }
}

/**
 * Create startup update
 * @param {string} startupId - Startup ID
 * @param {Object} updateData - Update data
 * @returns {Object} Result object
 */
export async function createStartupUpdate(startupId, updateData) {
  try {
    const authResult = await requireAuth(['startup'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('user_id')
      .eq('id', startupId)
      .single()

    if (!startup || startup.user_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    const { data, error } = await supabase
      .from('startup_updates')
      .insert({
        startup_id: startupId,
        ...updateData
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'startup_update_created', { 
      startup_id: startupId, 
      update_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating startup update:', error)
    return { error: 'Failed to create startup update', status: 500 }
  }
}

/**
 * Get startup updates
 * @param {string} startupId - Startup ID
 * @param {Object} options - Query options
 * @returns {Array} Array of updates
 */
export async function getStartupUpdates(startupId, options = {}) {
  try {
    let query = supabase
      .from('startup_updates')
      .select('*')
      .eq('startup_id', startupId)

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting startup updates:', error)
    return []
  }
}

/**
 * Send connection request to startup
 * @param {string} targetStartupId - Target startup ID
 * @param {string} message - Connection message
 * @returns {Object} Result object
 */
export async function sendStartupConnectionRequest(targetStartupId, message) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id')
      .or(`
        and(requester_id.eq.${user.id},target_id.eq.${targetStartupId}),
        and(requester_id.eq.${targetStartupId},target_id.eq.${user.id})
      `)
      .single()

    if (existing) {
      return { error: 'Connection already exists', status: 400 }
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        target_id: targetStartupId,
        connection_type: 'startup_to_startup',
        message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Send notification to target startup
    await sendNotification(targetStartupId, {
      type: 'connection_request',
      title: 'New Connection Request',
      message: `You have a new connection request from a startup`,
      metadata: { connection_id: data.id, requester_id: user.id }
    })

    // Log activity
    await logActivity(user.id, 'connection_request_sent', { 
      target_id: targetStartupId,
      connection_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error sending connection request:', error)
    return { error: 'Failed to send connection request', status: 500 }
  }
}

/**
 * Get startup statistics
 * @param {string} startupId - Startup ID
 * @returns {Object} Startup statistics
 */
export async function getStartupStats(startupId) {
  try {
    const [connectionsResult, updatesResult, viewsResult] = await Promise.all([
      supabase
        .from('connections')
        .select('id', { count: 'exact' })
        .or(`requester_id.eq.${startupId},target_id.eq.${startupId}`)
        .eq('status', 'accepted'),
      
      supabase
        .from('startup_updates')
        .select('id', { count: 'exact' })
        .eq('startup_id', startupId),
      
      supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('profile_id', startupId)
        .eq('profile_type', 'startup')
    ])

    return {
      connections: connectionsResult.count || 0,
      updates: updatesResult.count || 0,
      views: viewsResult.count || 0
    }
  } catch (error) {
    console.error('Error getting startup stats:', error)
    return {
      connections: 0,
      updates: 0,
      views: 0
    }
  }
}

/**
 * Search startups with advanced filters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Search results with pagination
 */
export async function searchStartups(searchParams) {
  try {
    const {
      query = '',
      industry,
      stage,
      location,
      fundingMin,
      fundingMax,
      teamSize,
      page = 1,
      limit = 12
    } = searchParams

    const offset = (page - 1) * limit

    let supabaseQuery = supabase
      .from('startup_profiles')
      .select(`
        *,
        profiles!inner(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Text search
    if (query) {
      supabaseQuery = supabaseQuery.or(`
        company_name.ilike.%${query}%,
        tagline.ilike.%${query}%,
        description.ilike.%${query}%
      `)
    }

    // Filters
    if (industry) {
      supabaseQuery = supabaseQuery.eq('industry', industry)
    }

    if (stage) {
      supabaseQuery = supabaseQuery.eq('stage', stage)
    }

    if (location) {
      supabaseQuery = supabaseQuery.ilike('location', `%${location}%`)
    }

    if (fundingMin) {
      supabaseQuery = supabaseQuery.gte('funding_raised', fundingMin)
    }

    if (fundingMax) {
      supabaseQuery = supabaseQuery.lte('funding_raised', fundingMax)
    }

    if (teamSize) {
      supabaseQuery = supabaseQuery.eq('team_size', teamSize)
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
    console.error('Error searching startups:', error)
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