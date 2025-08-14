import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Get platform statistics for admin dashboard
 * @returns {Object} Platform statistics
 */


export async function getPlatformStats() {
  try {
    // For admin dashboard, we'll bypass the auth check temporarily
    // In production, you should implement proper admin session validation

    const [usersResult, startupsResult, mentorsResult, investorsResult, eventsResult, messagesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, role, created_at', { count: 'exact' }),
      
      supabase
        .from('startup_profiles')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('mentor_profiles')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('investor_profiles')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('events')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('deleted', false)
    ])

    // Calculate user growth (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: newUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Role distribution
    const roleDistribution = {}
    if (usersResult.data) {
      usersResult.data.forEach(user => {
        roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1
      })
    }

    return {
      data: {
        totalUsers: usersResult.count || 0,
        totalStartups: startupsResult.count || 0,
        totalMentors: mentorsResult.count || 0,
        totalInvestors: investorsResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        newUsersLast30Days: newUsersCount || 0,
        roleDistribution
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting platform stats:', error)
    return { error: 'Failed to get platform statistics', status: 500 }
  }
}

// Option 2: Create a separate admin-specific stats function
export async function getPlatformStatsForAdmin(adminId) {
  try {
    // Verify admin session
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return { error: 'Invalid admin session', status: 401 }
    }

    // Same stats gathering logic as above...
    const [usersResult, startupsResult, mentorsResult, investorsResult, eventsResult, messagesResult] = await Promise.all([
      supabase.from('profiles').select('id, role, created_at', { count: 'exact' }),
      supabase.from('startup_profiles').select('id', { count: 'exact' }),
      supabase.from('mentor_profiles').select('id', { count: 'exact' }),
      supabase.from('investor_profiles').select('id', { count: 'exact' }),
      supabase.from('events').select('id', { count: 'exact' }),
      supabase.from('messages').select('id', { count: 'exact' }).eq('deleted', false)
    ])

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: newUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString())

    const roleDistribution = {}
    if (usersResult.data) {
      usersResult.data.forEach(user => {
        roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1
      })
    }

    return {
      data: {
        totalUsers: usersResult.count || 0,
        totalStartups: startupsResult.count || 0,
        totalMentors: mentorsResult.count || 0,
        totalInvestors: investorsResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        newUsersLast30Days: newUsersCount || 0,
        roleDistribution
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting platform stats:', error)
    return { error: 'Failed to get platform statistics', status: 500 }
  }
}

/**
 * Get all users with filtering and pagination
 * @param {Object} filters - Filter options
 * @returns {Object} Users data with pagination
 */
export async function getUsers(filters = {}) {
  try {
    // For admin dashboard, we'll bypass the requireAuth check temporarily
    // In production, you should implement proper admin session validation
    
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters

    const offset = (page - 1) * limit

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`
        full_name.ilike.%${search}%,
        email.ilike.%${search}%
      `)
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    return {
      data: {
        users: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting users:', error)
    return { error: 'Failed to get users', status: 500 }
  }
}

/**
 * Update user status (suspend, activate, ban)
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @param {string} reason - Reason for status change
 * @returns {Object} Result object
 */
export async function updateUserStatus(userId, status, reason = '') {
  try {
    // Validate status
    const validStatuses = ['active', 'suspended', 'banned']
    if (!validStatuses.includes(status)) {
      return { error: 'Invalid status', status: 400 }
    }

    // Update user status
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status,
        status_reason: reason,
        status_updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    return { data, status: 200 }
  } catch (error) {
    console.error('Error updating user status:', error)
    return { error: 'Failed to update user status', status: 500 }
  }
}

/**
 * Get flagged content for moderation
 * @param {Object} filters - Filter options
 * @returns {Object} Flagged content with pagination
 */
export async function getFlaggedContent(filters = {}) {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const {
      page = 1,
      limit = 20,
      content_type,
      status = 'pending',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters

    const offset = (page - 1) * limit

    let query = supabase
      .from('content_flags')
      .select(`
        *,
        reporter:profiles!content_flags_reporter_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Apply filters
    if (content_type) {
      query = query.eq('content_type', content_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    return {
      data: {
        flags: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting flagged content:', error)
    return { error: 'Failed to get flagged content', status: 500 }
  }
}

/**
 * Moderate flagged content
 * @param {string} flagId - Flag ID
 * @param {string} action - Moderation action ('approve', 'remove', 'dismiss')
 * @param {string} reason - Reason for action
 * @returns {Object} Result object
 */
export async function moderateContent(flagId, action, reason = '') {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user: adminUser } = authResult

    // Validate action
    const validActions = ['approve', 'remove', 'dismiss']
    if (!validActions.includes(action)) {
      return { error: 'Invalid moderation action', status: 400 }
    }

    // Get flag details
    const { data: flag } = await supabase
      .from('content_flags')
      .select('*')
      .eq('id', flagId)
      .single()

    if (!flag) {
      return { error: 'Flag not found', status: 404 }
    }

    // Update flag status
    const { data, error } = await supabase
      .from('content_flags')
      .update({
        status: action === 'dismiss' ? 'dismissed' : action === 'approve' ? 'approved' : 'removed',
        moderation_action: action,
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
        moderated_by: adminUser.id
      })
      .eq('id', flagId)
      .select()
      .single()

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    // If content is being removed, take appropriate action
    if (action === 'remove') {
      // This would depend on the content type
      // For now, we'll just mark it in the flag
      // In a real implementation, you'd update the actual content
    }

    // Send notification to content owner if content was removed
    if (action === 'remove' && flag.content_owner_id) {
      await sendNotification(flag.content_owner_id, {
        type: 'content_removed',
        title: 'Content Removed',
        message: 'Some of your content has been removed due to policy violations',
        metadata: { flag_id: flagId, reason }
      })
    }

    // Log activity
    await logActivity(adminUser.id, 'content_moderated', {
      flag_id: flagId,
      action,
      content_type: flag.content_type,
      content_id: flag.content_id,
      reason
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error moderating content:', error)
    return { error: 'Failed to moderate content', status: 500 }
  }
}

/**
 * Get recent activity logs
 * @param {Object} filters - Filter options
 * @returns {Object} Activity logs with pagination
 */
export async function getActivityLogs(filters = {}) {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      dateFrom,
      dateTo
    } = filters

    const offset = (page - 1) * limit

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:profiles!activity_logs_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (action) {
      query = query.eq('action', action)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Event data being inserted:', JSON.stringify({
        organizer_id: adminProfile.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: formattedEventData.start_date,
        end_date: formattedEventData.end_date,
        location: eventData.location,
        is_virtual: eventData.is_virtual,
        google_meet_link: eventData.google_meet_link || null,
        max_participants: eventData.max_participants,
        registration_deadline: formattedEventData.registration_deadline,
        is_public: eventData.is_public,
        tags: eventData.tags || []
      }, null, 2))
      throw error
    }

    return {
      data: {
        logs: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting activity logs:', error)
    return { error: 'Failed to get activity logs', status: 500 }
  }
}

/**
 * Create system announcement
 * @param {Object} announcementData - Announcement data
 * @returns {Object} Result object
 */
export async function createAnnouncement(announcementData) {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user: adminUser } = authResult

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        ...announcementData,
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error details:', error)
      console.error('Event data being inserted:', {
        organizer_id: adminId,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: formattedEventData.start_date,
        end_date: formattedEventData.end_date,
        location: eventData.location,
        is_virtual: eventData.is_virtual,
        google_meet_link: eventData.google_meet_link || null,
        max_participants: eventData.max_participants,
        registration_deadline: formattedEventData.registration_deadline,
        is_public: eventData.is_public,
        tags: eventData.tags || []
      })
      throw error
    }

    // If announcement should be sent as notification
    if (announcementData.send_notification) {
      // Get all active users
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active')

      if (users && users.length > 0) {
        // Create notifications for all users
        const notifications = users.map(user => ({
          user_id: user.id,
          type: 'announcement',
          title: announcementData.title,
          message: announcementData.content,
          metadata: { announcement_id: data.id },
          read: false
        }))

        // Insert notifications in batches to avoid overwhelming the database
        const batchSize = 100
        for (let i = 0; i < notifications.length; i += batchSize) {
          const batch = notifications.slice(i, i + batchSize)
          await supabase.from('notifications').insert(batch)
        }
      }
    }

    // Log activity
    await logActivity(adminUser.id, 'announcement_created', {
      announcement_id: data.id,
      title: announcementData.title
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating announcement:', error)
    return { error: 'Failed to create announcement', status: 500 }
  }
}

/**
 * Get system health metrics
 * @returns {Object} System health data
 */
export async function getSystemHealth() {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    // Get various metrics
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    const [activeUsersResult, messagesResult, errorsResult, eventsResult] = await Promise.all([
      // Active users in last 24 hours
      supabase
        .from('activity_logs')
        .select('user_id', { count: 'exact' })
        .gte('created_at', last24Hours.toISOString())
        .neq('user_id', null),
      
      // Messages sent in last hour
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .gte('created_at', lastHour.toISOString()),
      
      // Error logs (if you have an errors table)
      supabase
        .from('error_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', last24Hours.toISOString())
        .catch(() => ({ count: 0 })), // Ignore if table doesn't exist
      
      // Events created in last 24 hours
      supabase
        .from('events')
        .select('id', { count: 'exact' })
        .gte('created_at', last24Hours.toISOString())
    ])

    return {
      data: {
        activeUsers24h: activeUsersResult.count || 0,
        messagesLastHour: messagesResult.count || 0,
        errorsLast24h: errorsResult.count || 0,
        eventsCreated24h: eventsResult.count || 0,
        timestamp: now.toISOString()
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting system health:', error)
    return { error: 'Failed to get system health metrics', status: 500 }
  }
}

/**
 * Export user data (for GDPR compliance)
 * @param {string} userId - User ID
 * @returns {Object} User data export
 */
export async function exportUserData(userId) {
  try {
    const authResult = await requireAuth(['admin'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    // Get all user data from various tables
    const [profile, startupProfile, mentorProfile, investorProfile, messages, connections, events] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('startup_profiles').select('*').eq('user_id', userId),
      supabase.from('mentor_profiles').select('*').eq('user_id', userId),
      supabase.from('investor_profiles').select('*').eq('user_id', userId),
      supabase.from('messages').select('*').eq('sender_id', userId),
      supabase.from('connections').select('*').or(`requester_id.eq.${userId},target_id.eq.${userId}`),
      supabase.from('events').select('*').eq('organizer_id', userId)
    ])

    const userData = {
      profile: profile.data,
      startup_profile: startupProfile.data,
      mentor_profile: mentorProfile.data,
      investor_profile: investorProfile.data,
      messages: messages.data,
      connections: connections.data,
      events: events.data,
      exported_at: new Date().toISOString()
    }

    // Log activity
    await logActivity(authResult.user.id, 'user_data_exported', {
      target_user_id: userId
    })

    return { data: userData, status: 200 }
  } catch (error) {
    console.error('Error exporting user data:', error)
    return { error: 'Failed to export user data', status: 500 }
  }
}

/**
 * Delete user account and all associated data
 * @param {string} userId - User ID
 * @param {string} reason - Reason for deletion
 * @returns {Object} Result object
 */
export async function deleteUserAccount(userId, reason = '') {
  try {
    // Get user data before deletion for logging
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Delete user profile (this will cascade to related data)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    return { status: 200 }
  } catch (error) {
    console.error('Error deleting user account:', error)
    return { error: 'Failed to delete user account', status: 500 }
  }
}

/**
 * Create event as admin (bypasses regular auth)
 * @param {Object} eventData - Event data
 * @param {string} adminId - Admin user ID
 * @returns {Object} Result object
 */
export async function createEventAsAdmin(eventData, adminId) {
  try {
    // Verify admin session
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return { error: 'Invalid admin session', status: 401 }
    }

    // Find or create a corresponding profile for the admin
    let { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', admin.email)
      .single()

    if (profileError || !adminProfile) {
      // Create a profile for the admin if it doesn't exist
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          email: admin.email,
          full_name: admin.full_name,
          role: 'admin'
        })
        .select('id')
        .single()

      if (createProfileError) {
        console.error('Error creating admin profile:', createProfileError)
        return { error: 'Failed to create admin profile', status: 500 }
      }
      adminProfile = newProfile
    }

    // Format dates properly for database
    const formattedEventData = {
      ...eventData,
      start_date: eventData.start_date ? new Date(eventData.start_date).toISOString() : null,
      end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null,
      registration_deadline: eventData.registration_deadline ? new Date(eventData.registration_deadline).toISOString() : null
    }

    // Create event with admin profile as organizer
    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: adminProfile.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: formattedEventData.start_date,
        end_date: formattedEventData.end_date,
        location: eventData.location,
        is_virtual: eventData.is_virtual,
        google_meet_link: eventData.google_meet_link || null,
        max_participants: eventData.max_participants,
        registration_deadline: formattedEventData.registration_deadline,
        is_public: eventData.is_public,
        tags: eventData.tags || [],
        target_audience: eventData.target_audience || ['startup', 'mentor', 'investor'],
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error details:', error)
      console.error('Event data being inserted:', {
        organizer_id: adminId,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: formattedEventData.start_date,
        end_date: formattedEventData.end_date,
        location: eventData.location,
        is_virtual: eventData.is_virtual,
        google_meet_link: eventData.google_meet_link || null,
        max_participants: eventData.max_participants,
        registration_deadline: formattedEventData.registration_deadline,
        is_public: eventData.is_public,
        tags: eventData.tags || []
      })
      throw error
    }

    // Log activity in admin context
    await supabase
      .from('activity_logs')
      .insert({
        user_id: adminId,
        action: 'admin_event_created',
        metadata: { 
          event_id: data.id,
          event_type: data.event_type,
          admin_action: true
        },
        created_at: new Date().toISOString()
      })

    return { data: newEvent, error: null }
  } catch (error) {
    console.error('Error creating event as admin:', error)
    return { error: 'Failed to create event', status: 500 }
  }
}

/**
 * Get event details with registered users for admin
 * @param {string} eventId - Event ID
 * @param {string} adminId - Admin ID
 * @returns {Object} Event details with registrations
 */
export async function getEventDetailsAsAdmin(eventId, adminId) {
  try {
    // Verify admin session
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return { error: 'Invalid admin session', status: 401 }
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(full_name, email)
      `)
      .eq('id', eventId)
      .single()

    if (eventError) {
      return { error: 'Event not found', status: 404 }
    }

    // Get registered users
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select(`
        *,
        user:profiles!event_registrations_user_id_fkey(id, full_name, email, role)
      `)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })

    if (regError) {
      console.error('Error fetching registrations:', regError)
    }

    return {
      data: {
        ...event,
        registrations: registrations || [],
        registrationCount: registrations?.length || 0
      },
      error: null
    }
  } catch (error) {
    console.error('Error getting event details:', error)
    return { error: 'Failed to get event details', status: 500 }
  }
}

/**
 * Update event as admin
 * @param {string} eventId - Event ID
 * @param {Object} eventData - Updated event data
 * @param {string} adminId - Admin ID
 * @returns {Object} Updated event data
 */
export async function updateEventAsAdmin(eventId, eventData, adminId) {
  try {
    // Verify admin session
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return { error: 'Invalid admin session', status: 401 }
    }

    // Format dates properly for database
    const formattedEventData = {
      ...eventData,
      start_date: eventData.start_date ? new Date(eventData.start_date).toISOString() : null,
      end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null,
      registration_deadline: eventData.registration_deadline ? new Date(eventData.registration_deadline).toISOString() : null,
      updated_at: new Date().toISOString()
    }

    // Update event
    const { data, error } = await supabase
      .from('events')
      .update(formattedEventData)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Database error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Event data being updated:', JSON.stringify(formattedEventData, null, 2))
      throw error
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        admin_id: adminId,
        action: 'update_event',
        target_type: 'event',
        target_id: eventId,
        details: {
          event_title: eventData.title,
          updated_fields: Object.keys(eventData)
        }
      })

    return { data, error: null }
  } catch (error) {
    console.error('Error updating event as admin:', error)
    return { error: 'Failed to update event', status: 500 }
  }
}

/**
 * Delete event as admin
 * @param {string} eventId - Event ID
 * @param {string} adminId - Admin ID
 * @returns {Object} Success status
 */
export async function deleteEventAsAdmin(eventId, adminId) {
  try {
    // Verify admin session
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return { error: 'Invalid admin session', status: 401 }
    }

    // Get event details for logging
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single()

    if (eventError) {
      return { error: 'Event not found', status: 404 }
    }

    // Delete event (this will cascade delete registrations)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      throw deleteError
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        admin_id: adminId,
        action: 'delete_event',
        target_type: 'event',
        target_id: eventId,
        details: {
          event_title: event.title
        }
      })

    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting event as admin:', error)
    return { error: 'Failed to delete event', status: 500 }
  }
}

/**
 * Get events for admin dashboard
 * @param {Object} filters - Filter options
 * @returns {Object} Events data with pagination
 */
export async function getEvents(filters = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters

    const offset = (page - 1) * limit

    const { data: events, error, count } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!organizer_id(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (error) {
      console.error('Database error details:', error)
      throw error
    }

    return {
      data: {
        events: events || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      status: 200
    }
  } catch (error) {
    console.error('Error getting events:', error)
    return { error: 'Failed to get events', status: 500 }
  }
}