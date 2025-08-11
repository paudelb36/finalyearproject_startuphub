import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Register for an event
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

    // Check if event exists and is active
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (!event) {
      return { error: 'Event not found', status: 404 }
    }

    if (event.status !== 'active') {
      return { error: 'Event is not available for registration', status: 400 }
    }

    // Check if registration deadline has passed
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return { error: 'Registration deadline has passed', status: 400 }
    }

    // Check if event is full
    if (event.max_participants) {
      const { count } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('status', 'confirmed')

      if (count >= event.max_participants) {
        return { error: 'Event is full', status: 400 }
      }
    }

    // Check if user is already registered
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      if (existing.status === 'confirmed') {
        return { error: 'Already registered for this event', status: 400 }
      } else if (existing.status === 'pending') {
        return { error: 'Registration is pending approval', status: 400 }
      }
    }

    // Create registration
    const { data, error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: user.id,
        status: event.requires_approval ? 'pending' : 'confirmed',
        registration_type: registrationData.registration_type || 'attendee',
        notes: registrationData.notes || '',
        metadata: registrationData.metadata || {}
      })
      .select(`
        *,
        event:events(
          id,
          title,
          start_date,
          organizer_id
        )
      `)
      .single()

    if (error) throw error

    // Send notification to event organizer
    if (data.event?.organizer_id) {
      await sendNotification(data.event.organizer_id, {
        type: 'event_registration',
        title: 'New Event Registration',
        message: `${authResult.profile?.full_name || 'Someone'} registered for your event: ${data.event.title}`,
        metadata: { 
          event_id: eventId, 
          registration_id: data.id,
          user_id: user.id
        }
      })
    }

    // Send confirmation to user
    await sendNotification(user.id, {
      type: 'registration_confirmation',
      title: 'Event Registration Confirmed',
      message: `You have successfully registered for: ${data.event.title}`,
      metadata: { 
        event_id: eventId, 
        registration_id: data.id
      }
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
 * Cancel event registration
 * @param {string} registrationId - Registration ID
 * @returns {Object} Result object
 */
export async function cancelEventRegistration(registrationId) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get registration details
    const { data: registration } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:events(
          id,
          title,
          start_date,
          organizer_id
        )
      `)
      .eq('id', registrationId)
      .single()

    if (!registration) {
      return { error: 'Registration not found', status: 404 }
    }

    // Check if user owns this registration
    if (registration.user_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    // Check if event has already started
    if (registration.event?.start_date && new Date(registration.event.start_date) < new Date()) {
      return { error: 'Cannot cancel registration for events that have already started', status: 400 }
    }

    // Update registration status to cancelled
    const { data, error } = await supabase
      .from('event_registrations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single()

    if (error) throw error

    // Send notification to event organizer
    if (registration.event?.organizer_id) {
      await sendNotification(registration.event.organizer_id, {
        type: 'registration_cancelled',
        title: 'Event Registration Cancelled',
        message: `${authResult.profile?.full_name || 'Someone'} cancelled their registration for: ${registration.event.title}`,
        metadata: { 
          event_id: registration.event_id, 
          registration_id: registrationId,
          user_id: user.id
        }
      })
    }

    // Log activity
    await logActivity(user.id, 'event_registration_cancelled', { 
      event_id: registration.event_id,
      registration_id: registrationId
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error cancelling event registration:', error)
    return { error: 'Failed to cancel registration', status: 500 }
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
          end_date,
          location,
          is_virtual,
          status,
          organizer:profiles!events_organizer_id_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)

    if (filters.status) {
      query = query.eq('status', filters.status)
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
 * Get event registrations (for event organizers)
 * @param {string} eventId - Event ID
 * @param {Object} filters - Filter options
 * @returns {Array} Array of registrations
 */
export async function getEventRegistrations(eventId, filters = {}) {
  try {
    const authResult = await requireAuth()
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

    if (!event || event.organizer_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    let query = supabase
      .from('event_registrations')
      .select(`
        *,
        user:profiles!event_registrations_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq('event_id', eventId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return { data: data || [], status: 200 }
  } catch (error) {
    console.error('Error getting event registrations:', error)
    return { error: 'Failed to get event registrations', status: 500 }
  }
}

/**
 * Approve or reject event registration (for organizers)
 * @param {string} registrationId - Registration ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} message - Optional message
 * @returns {Object} Result object
 */
export async function moderateEventRegistration(registrationId, action, message = '') {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get registration and event details
    const { data: registration } = await supabase
      .from('event_registrations')
      .select(`
        *,
        event:events(
          id,
          title,
          organizer_id
        )
      `)
      .eq('id', registrationId)
      .single()

    if (!registration) {
      return { error: 'Registration not found', status: 404 }
    }

    // Check if user is the event organizer
    if (registration.event?.organizer_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    const newStatus = action === 'approve' ? 'confirmed' : 'rejected'

    // Update registration status
    const { data, error } = await supabase
      .from('event_registrations')
      .update({
        status: newStatus,
        moderator_message: message,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id
      })
      .eq('id', registrationId)
      .select()
      .single()

    if (error) throw error

    // Send notification to user
    await sendNotification(registration.user_id, {
      type: 'registration_moderated',
      title: `Registration ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your registration for "${registration.event.title}" has been ${action === 'approve' ? 'approved' : 'rejected'}${message ? `: ${message}` : ''}`,
      metadata: { 
        event_id: registration.event_id, 
        registration_id: registrationId,
        action
      }
    })

    // Log activity
    await logActivity(user.id, `registration_${action}d`, { 
      event_id: registration.event_id,
      registration_id: registrationId,
      user_id: registration.user_id
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error moderating event registration:', error)
    return { error: 'Failed to moderate registration', status: 500 }
  }
}