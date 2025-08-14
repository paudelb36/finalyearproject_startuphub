import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Get all events with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Array} Array of events
 */
export async function getEvents(filters = {}) {
  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        registrations:event_registrations(
          id,
          user_id,
          status
        )
      `)

    // Apply filters
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters.organizer_id) {
      query = query.eq('organizer_id', filters.organizer_id)
    }
    
    if (filters.upcoming) {
      query = query.gte('start_date', new Date().toISOString())
    }
    
    if (filters.search) {
      query = query.or(`
        title.ilike.%${filters.search}%,
        description.ilike.%${filters.search}%
      `)
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query.order('start_date', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting events:', error)
    return []
  }
}

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Object|null} Event data or null
 */
export async function getEventById(eventId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        registrations:event_registrations(
          id,
          user_id,
          startup_id,
          status,
          registration_type,
          created_at,
          startup:startup_profiles(
            id,
            company_name,
            logo_url
          )
        )
      `)
      .eq('id', eventId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting event by ID:', error)
    return null
  }
}

/**
 * Create event
 * @param {Object} eventData - Event data
 * @returns {Object} Result object
 */
export async function createEvent(eventData) {
  try {
    const authResult = await requireAuth(['admin', 'mentor', 'investor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        ...eventData,
        target_audience: eventData.target_audience || ['startup', 'mentor', 'investor'],
        status: 'upcoming'
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'event_created', { 
      event_id: data.id,
      event_type: data.event_type 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error creating event:', error)
    return { error: 'Failed to create event', status: 500 }
  }
}

/**
 * Update event
 * @param {string} eventId - Event ID
 * @param {Object} updates - Event updates
 * @returns {Object} Result object
 */
export async function updateEvent(eventId, updates) {
  try {
    const authResult = await requireAuth(['admin', 'mentor', 'investor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership (unless admin)
    if (authResult.profile.role !== 'admin') {
      const { data: event } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single()

      if (!event || event.organizer_id !== user.id) {
        return { error: 'Unauthorized', status: 403 }
      }
    }

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'event_updated', { event_id: eventId })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error updating event:', error)
    return { error: 'Failed to update event', status: 500 }
  }
}

/**
 * Get events filtered by user role
 * @param {string} userRole - User's role
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of events
 */
export async function getEventsForUserRole(userRole, filters = {}) {
  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        registrations:event_registrations(
          id,
          user_id,
          status
        )
      `)
      .gte('start_date', new Date().toISOString())
      .eq('is_public', true)

    // Apply role-based filtering
    if (userRole && userRole !== 'admin') {
      query = query.or(`target_audience.cs.{"all"},target_audience.cs.{"${userRole}"}`)
    }

    // Apply additional filters
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }
    
    if (filters.search) {
      query = query.or(`
        title.ilike.%${filters.search}%,
        description.ilike.%${filters.search}%
      `)
    }

    query = query.order('start_date', { ascending: true })

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching events for user role:', error)
    throw error
  }
}

/**
 * Register for event
 * @param {string} eventId - Event ID
 * @param {Object} registrationData - Registration data
 * @returns {Object} Result object
 */
export async function registerForEvent(eventId, registrationData = {}) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check if event exists and is open for registration
    const { data: event } = await supabase
      .from('events')
      .select('*, target_audience')
      .eq('id', eventId)
      .single()

    if (!event) {
      return { error: 'Event not found', status: 404 }
    }

    if (event.status !== 'upcoming') {
      return { error: 'Event is not open for registration', status: 400 }
    }

    if (new Date(event.registration_deadline) < new Date()) {
      return { error: 'Registration deadline has passed', status: 400 }
    }

    // Check if user's role is allowed for this event
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (event.target_audience && event.target_audience.length > 0) {
      const canRegister = event.target_audience.includes('all') || 
                         event.target_audience.includes(userProfile?.role)
      
      if (!canRegister) {
        return { error: 'This event is not open to your user type', status: 403 }
      }
    }

    // Check if user is already registered
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return { error: 'Already registered for this event', status: 400 }
    }

    // Check capacity
    if (event.max_attendees) {
      const { count } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('status', 'confirmed')

      if (count >= event.max_attendees) {
        return { error: 'Event is full', status: 400 }
      }
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: user.id,
        registration_type: registrationData.registration_type || 'attendee',
        startup_id: registrationData.startup_id,
        application_data: registrationData.application_data,
        status: 'confirmed'
      })
      .select()
      .single()

    if (error) throw error

    // Send notification to event organizer
    await sendNotification(event.organizer_id, {
      type: 'event_registration',
      title: 'New Event Registration',
      message: `Someone registered for your event: ${event.title}`,
      metadata: { event_id: eventId, registration_id: data.id }
    })

    // Log activity
    await logActivity(user.id, 'event_registered', { 
      event_id: eventId,
      registration_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error registering for event:', error)
    return { error: 'Failed to register for event', status: 500 }
  }
}

/**
 * Unregister from event
 * @param {string} eventId - Event ID
 * @returns {Object} Result object
 */
export async function unregisterFromEvent(eventId) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Find registration
    const { data: registration } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (!registration) {
      return { error: 'Registration not found', status: 404 }
    }

    // Delete registration
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('id', registration.id)

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'event_unregistered', { 
      event_id: eventId,
      registration_id: registration.id 
    })

    return { success: true, status: 200 }
  } catch (error) {
    console.error('Error unregistering from event:', error)
    return { error: 'Failed to unregister from event', status: 500 }
  }
}

/**
 * Apply to pitch at event
 * @param {string} eventId - Event ID
 * @param {Object} applicationData - Application data
 * @returns {Object} Result object
 */
export async function applyToPitchEvent(eventId, applicationData) {
  try {
    const authResult = await requireAuth(['startup'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get startup profile
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!startup) {
      return { error: 'Startup profile not found', status: 404 }
    }

    // Check if event exists and is a pitch event
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('event_type', 'pitch')
      .single()

    if (!event) {
      return { error: 'Pitch event not found', status: 404 }
    }

    if (event.status !== 'upcoming') {
      return { error: 'Event is not accepting applications', status: 400 }
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('startup_id', startup.id)
      .eq('registration_type', 'pitch_application')
      .single()

    if (existing) {
      return { error: 'Already applied to this pitch event', status: 400 }
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: user.id,
        startup_id: startup.id,
        registration_type: 'pitch_application',
        application_data: applicationData,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Send notification to event organizer
    await sendNotification(event.organizer_id, {
      type: 'pitch_application',
      title: 'New Pitch Application',
      message: `A startup applied to pitch at your event: ${event.title}`,
      metadata: { event_id: eventId, application_id: data.id, startup_id: startup.id }
    })

    // Log activity
    await logActivity(user.id, 'pitch_application_submitted', { 
      event_id: eventId,
      application_id: data.id 
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error applying to pitch event:', error)
    return { error: 'Failed to apply to pitch event', status: 500 }
  }
}

/**
 * Get user's event registrations
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Array} Array of registrations
 */
export async function getUserEventRegistrations(userId, filters = {}) {
  try {
    let query = supabase
      .from('event_registrations')
      .select(`
        *,
        event:events(
          id,
          title,
          description,
          event_type,
          start_date,
          location,
          status
        )
      `)
      .eq('user_id', userId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.registration_type) {
      query = query.eq('registration_type', filters.registration_type)
    }

    if (filters.upcoming) {
      query = query.gte('event.start_date', new Date().toISOString())
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting user event registrations:', error)
    return []
  }
}

/**
 * Get event statistics
 * @param {string} eventId - Event ID
 * @returns {Object} Event statistics
 */
export async function getEventStats(eventId) {
  try {
    const [registrationsResult, applicationsResult] = await Promise.all([
      supabase
        .from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('registration_type', 'attendee'),
      
      supabase
        .from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('registration_type', 'pitch_application')
    ])

    return {
      totalRegistrations: registrationsResult.count || 0,
      pitchApplications: applicationsResult.count || 0
    }
  } catch (error) {
    console.error('Error getting event stats:', error)
    return {
      totalRegistrations: 0,
      pitchApplications: 0
    }
  }
}

/**
 * Search events with advanced filters
 * @param {Object} searchParams - Search parameters
 * @returns {Object} Search results with pagination
 */
export async function searchEvents(searchParams) {
  try {
    const {
      query = '',
      event_type,
      status,
      location,
      dateFrom,
      dateTo,
      page = 1,
      limit = 12
    } = searchParams

    const offset = (page - 1) * limit

    let supabaseQuery = supabase
      .from('events')
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    // Text search
    if (query) {
      supabaseQuery = supabaseQuery.or(`
        title.ilike.%${query}%,
        description.ilike.%${query}%
      `)
    }

    // Filters
    if (event_type) {
      supabaseQuery = supabaseQuery.eq('event_type', event_type)
    }

    if (status) {
      supabaseQuery = supabaseQuery.eq('status', status)
    }

    if (location) {
      supabaseQuery = supabaseQuery.ilike('location', `%${location}%`)
    }

    if (dateFrom) {
      supabaseQuery = supabaseQuery.gte('start_date', dateFrom)
    }

    if (dateTo) {
      supabaseQuery = supabaseQuery.lte('start_date', dateTo)
    }

    const { data, error, count } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('start_date', { ascending: true })

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
    console.error('Error searching events:', error)
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
 * Cancel event
 * @param {string} eventId - Event ID
 * @param {string} reason - Cancellation reason
 * @returns {Object} Result object
 */
export async function cancelEvent(eventId, reason = '') {
  try {
    const authResult = await requireAuth(['admin', 'mentor', 'investor'])
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Check ownership (unless admin)
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (!event) {
      return { error: 'Event not found', status: 404 }
    }

    if (authResult.profile.role !== 'admin' && event.organizer_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    // Update event status
    const { data, error } = await supabase
      .from('events')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error

    // Get all registered users
    const { data: registrations } = await supabase
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', eventId)

    // Send notifications to all registered users
    if (registrations && registrations.length > 0) {
      const notifications = registrations.map(reg => ({
        user_id: reg.user_id,
        type: 'event_cancelled',
        title: 'Event Cancelled',
        message: `The event "${event.title}" has been cancelled`,
        metadata: { event_id: eventId, reason },
        read: false
      }))

      await supabase.from('notifications').insert(notifications)
    }

    // Log activity
    await logActivity(user.id, 'event_cancelled', { 
      event_id: eventId,
      reason 
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error cancelling event:', error)
    return { error: 'Failed to cancel event', status: 500 }
  }
}