import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification } from './auth'

/**
 * Send a mentorship request from startup to mentor
 * @param {string} mentorId - Target mentor ID
 * @param {string} message - Request message
 * @returns {Object} Result object
 */
export async function sendMentorshipRequest(mentorId, message) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Verify user is a startup
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'startup') {
      return { error: 'Only startups can send mentorship requests', status: 403 }
    }

    // Verify target is a mentor
    const { data: mentorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', mentorId)
      .single()

    if (mentorProfile?.role !== 'mentor') {
      return { error: 'Target user is not a mentor', status: 400 }
    }

    // Can't send request to yourself
    if (user.id === mentorId) {
      return { error: 'Cannot send mentorship request to yourself', status: 400 }
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('mentorship_requests')
      .select('id, status')
      .eq('startup_id', user.id)
      .eq('mentor_id', mentorId)
      .single()

    if (existing) {
      if (existing.status === 'pending') {
        return { error: 'Mentorship request already pending', status: 400 }
      } else if (existing.status === 'accepted') {
        return { error: 'Mentorship already established', status: 400 }
      }
    }

    // Create mentorship request
    const { data, error } = await supabase
      .from('mentorship_requests')
      .insert({
        startup_id: user.id,
        mentor_id: mentorId,
        message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating mentorship request:', error)
      return { error: 'Failed to send mentorship request', status: 500 }
    }

    return { data, status: 201 }
  } catch (error) {
    console.error('Error in sendMentorshipRequest:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Send an investment request from startup to investor
 * @param {string} investorId - Target investor ID
 * @param {string} message - Request message
 * @param {string} pitchDeckUrl - Optional pitch deck URL
 * @returns {Object} Result object
 */
export async function sendInvestmentRequest(investorId, message, pitchDeckUrl = null) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Verify user is a startup
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'startup') {
      return { error: 'Only startups can send investment requests', status: 403 }
    }

    // Verify target is an investor
    const { data: investorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', investorId)
      .single()

    if (investorProfile?.role !== 'investor') {
      return { error: 'Target user is not an investor', status: 400 }
    }

    // Can't send request to yourself
    if (user.id === investorId) {
      return { error: 'Cannot send investment request to yourself', status: 400 }
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('investment_requests')
      .select('id, status')
      .eq('startup_id', user.id)
      .eq('investor_id', investorId)
      .single()

    if (existing) {
      if (existing.status === 'pending') {
        return { error: 'Investment request already pending', status: 400 }
      } else if (existing.status === 'accepted') {
        return { error: 'Investment already established', status: 400 }
      }
    }

    // Create investment request
    const { data, error } = await supabase
      .from('investment_requests')
      .insert({
        startup_id: user.id,
        investor_id: investorId,
        message,
        pitch_deck_url: pitchDeckUrl,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating investment request:', error)
      return { error: 'Failed to send investment request', status: 500 }
    }

    return { data, status: 201 }
  } catch (error) {
    console.error('Error in sendInvestmentRequest:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Respond to a mentorship request (accept/reject)
 * @param {string} requestId - Request ID
 * @param {string} response - 'accepted' or 'rejected'
 * @param {string} responseMessage - Optional response message
 * @returns {Object} Result object
 */
export async function respondToMentorshipRequest(requestId, response, responseMessage = '') {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Verify the request exists and user is the mentor
    const { data: request, error: fetchError } = await supabase
      .from('mentorship_requests')
      .select('*')
      .eq('id', requestId)
      .eq('mentor_id', user.id)
      .single()

    if (fetchError || !request) {
      return { error: 'Mentorship request not found', status: 404 }
    }

    if (request.status !== 'pending') {
      return { error: 'Request has already been responded to', status: 400 }
    }

    // Update the request
    const { data, error } = await supabase
      .from('mentorship_requests')
      .update({
        status: response,
        response_message: responseMessage,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating mentorship request:', error)
      return { error: 'Failed to respond to request', status: 500 }
    }

    // Send notification to startup
    await sendNotification(
      request.startup_id,
      'mentorship_response',
      `Mentorship request ${response}`,
      `Your mentorship request has been ${response}`,
      requestId
    )

    return { data, status: 200 }
  } catch (error) {
    console.error('Error in respondToMentorshipRequest:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Respond to an investment request (accept/reject)
 * @param {string} requestId - Request ID
 * @param {string} response - 'accepted' or 'rejected'
 * @param {string} responseMessage - Optional response message
 * @returns {Object} Result object
 */
export async function respondToInvestmentRequest(requestId, response, responseMessage = '') {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Verify the request exists and user is the investor
    const { data: request, error: fetchError } = await supabase
      .from('investment_requests')
      .select('*')
      .eq('id', requestId)
      .eq('investor_id', user.id)
      .single()

    if (fetchError || !request) {
      return { error: 'Investment request not found', status: 404 }
    }

    if (request.status !== 'pending') {
      return { error: 'Request has already been responded to', status: 400 }
    }

    // Update the request
    const { data, error } = await supabase
      .from('investment_requests')
      .update({
        status: response,
        response_message: responseMessage,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating investment request:', error)
      return { error: 'Failed to respond to request', status: 500 }
    }

    // Send notification to startup
    await sendNotification(
      request.startup_id,
      'investment_response',
      `Investment request ${response}`,
      `Your investment request has been ${response}`,
      requestId
    )

    return { data, status: 200 }
  } catch (error) {
    console.error('Error in respondToInvestmentRequest:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Cancel a pending request
 * @param {string} requestId - Request ID
 * @param {string} requestType - 'mentorship' or 'investment'
 * @returns {Object} Result object
 */
export async function cancelRequest(requestId, requestType) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult
    const tableName = requestType === 'mentorship' ? 'mentorship_requests' : 'investment_requests'

    // Verify the request exists and user is the sender
    const { data: request, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', requestId)
      .eq('startup_id', user.id)
      .single()

    if (fetchError || !request) {
      return { error: 'Request not found', status: 404 }
    }

    if (request.status !== 'pending') {
      return { error: 'Can only cancel pending requests', status: 400 }
    }

    // Update the request status to cancelled
    const { data, error } = await supabase
      .from(tableName)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling request:', error)
      return { error: 'Failed to cancel request', status: 500 }
    }

    return { data, status: 200 }
  } catch (error) {
    console.error('Error in cancelRequest:', error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Get mentorship requests for a user
 * @param {string} userId - User ID
 * @param {string} type - 'sent' or 'received'
 * @param {string} status - Optional status filter
 * @returns {Object} Result object
 */
export async function getMentorshipRequests(userId, type = 'received', status = null) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    let query = supabase
      .from('mentorship_requests')
      .select(`
        *,
        startup:profiles!inner(id, full_name, avatar_url),
        mentor:profiles!inner(id, full_name, avatar_url),
        startup_profile:startup_profiles!inner(company_name, logo_url),
        mentor_profile:mentor_profiles!inner(expertise_tags, hourly_rate)
      `)

    if (type === 'sent') {
      query = query.eq('startup_id', userId)
    } else {
      query = query.eq('mentor_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching mentorship requests:', error?.message || error)
      return { error: 'Failed to fetch requests', status: 500 }
    }

    return { data, status: 200 }
  } catch (error) {
    console.error('Error in getMentorshipRequests:', error?.message || error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Get investment requests for a user
 * @param {string} userId - User ID
 * @param {string} type - 'sent' or 'received'
 * @param {string} status - Optional status filter
 * @returns {Object} Result object
 */
export async function getInvestmentRequests(userId, type = 'received', status = null) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    let query = supabase
      .from('investment_requests')
      .select(`
        *,
        startup:profiles!inner(id, full_name, avatar_url),
        investor:profiles!inner(id, full_name, avatar_url),
        startup_profile:startup_profiles!inner(company_name, logo_url, stage, funding_raised),
        investor_profile:investor_profiles!inner(fund_name, ticket_size_min, ticket_size_max)
      `)

    if (type === 'sent') {
      query = query.eq('startup_id', userId)
    } else {
      query = query.eq('investor_id', userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching investment requests:', error?.message || error)
      return { error: 'Failed to fetch requests', status: 500 }
    }

    return { data, status: 200 }
  } catch (error) {
    console.error('Error in getInvestmentRequests:', error?.message || error)
    return { error: 'Internal server error', status: 500 }
  }
}

/**
 * Get request statistics for a user
 * @param {string} userId - User ID
 * @returns {Object} Result object
 */
export async function getRequestStats(userId) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const stats = {
      mentorship: { sent: 0, received: 0, pending: 0, accepted: 0 },
      investment: { sent: 0, received: 0, pending: 0, accepted: 0 }
    }

    // Get mentorship stats
    if (profile?.role === 'startup') {
      const { data: mentorshipSent } = await supabase
        .from('mentorship_requests')
        .select('status')
        .eq('startup_id', userId)

      if (mentorshipSent) {
        stats.mentorship.sent = mentorshipSent.length
        stats.mentorship.pending += mentorshipSent.filter(r => r.status === 'pending').length
        stats.mentorship.accepted += mentorshipSent.filter(r => r.status === 'accepted').length
      }

      const { data: investmentSent } = await supabase
        .from('investment_requests')
        .select('status')
        .eq('startup_id', userId)

      if (investmentSent) {
        stats.investment.sent = investmentSent.length
        stats.investment.pending += investmentSent.filter(r => r.status === 'pending').length
        stats.investment.accepted += investmentSent.filter(r => r.status === 'accepted').length
      }
    }

    if (profile?.role === 'mentor') {
      const { data: mentorshipReceived } = await supabase
        .from('mentorship_requests')
        .select('status')
        .eq('mentor_id', userId)

      if (mentorshipReceived) {
        stats.mentorship.received = mentorshipReceived.length
        stats.mentorship.pending += mentorshipReceived.filter(r => r.status === 'pending').length
        stats.mentorship.accepted += mentorshipReceived.filter(r => r.status === 'accepted').length
      }
    }

    if (profile?.role === 'investor') {
      const { data: investmentReceived } = await supabase
        .from('investment_requests')
        .select('status')
        .eq('investor_id', userId)

      if (investmentReceived) {
        stats.investment.received = investmentReceived.length
        stats.investment.pending += investmentReceived.filter(r => r.status === 'pending').length
        stats.investment.accepted += investmentReceived.filter(r => r.status === 'accepted').length
      }
    }

    return { data: stats, status: 200 }
  } catch (error) {
    console.error('Error in getRequestStats:', error)
    return { error: 'Internal server error', status: 500 }
  }
}