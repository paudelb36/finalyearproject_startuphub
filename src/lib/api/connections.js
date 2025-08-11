import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity } from './auth'

/**
 * Send a general connection request to any user
 * @param {string} targetUserId - Target user ID
 * @param {string} message - Connection message
 * @param {string} connectionType - Type of connection (general, mentorship, investment)
 * @returns {Object} Result object
 */
export async function sendConnectionRequest(targetUserId, message, connectionType = 'general') {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Can't connect to yourself
    if (user.id === targetUserId) {
      return { error: 'Cannot connect to yourself', status: 400 }
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id, status')
      .or(`
        and(requester_id.eq.${user.id},target_id.eq.${targetUserId}),
        and(requester_id.eq.${targetUserId},target_id.eq.${user.id})
      `)
      .single()

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: 'Already connected', status: 400 }
      } else if (existing.status === 'pending') {
        return { error: 'Connection request already pending', status: 400 }
      }
    }

    // Create connection request
    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        target_id: targetUserId,
        connection_type: connectionType,
        message,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // Send notification to target user
    await sendNotification(targetUserId, {
      type: 'connection_request',
      title: 'New Connection Request',
      message: `You have a new connection request from ${authResult.profile?.full_name || 'someone'}`,
      metadata: { connection_id: data.id, requester_id: user.id }
    })

    // Log activity
    await logActivity(user.id, 'connection_request_sent', { 
      target_id: targetUserId,
      connection_id: data.id,
      connection_type: connectionType
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error sending connection request:', error)
    return { error: 'Failed to send connection request', status: 500 }
  }
}

/**
 * Respond to a connection request
 * @param {string} connectionId - Connection ID
 * @param {string} response - 'accepted' or 'declined'
 * @param {string} message - Response message
 * @returns {Object} Result object
 */
export async function respondToConnectionRequest(connectionId, response, message = '') {
  try {
    const authResult = await requireAuth()
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

    // Check if user is the target
    if (connection.target_id !== user.id) {
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
      type: 'connection_response',
      title: `Connection Request ${response === 'accepted' ? 'Accepted' : 'Declined'}`,
      message: `Your connection request has been ${response}`,
      metadata: { connection_id: connectionId, target_id: connection.target_id }
    })

    // Log activity
    await logActivity(user.id, `connection_request_${response}`, { 
      connection_id: connectionId,
      requester_id: connection.requester_id
    })

    return { data, status: 200 }
  } catch (error) {
    console.error('Error responding to connection request:', error)
    return { error: 'Failed to respond to connection request', status: 500 }
  }
}

/**
 * Get user's connections
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Array} Array of connections
 */
export async function getUserConnections(userId, filters = {}) {
  try {
    let query = supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        target:profiles!connections_target_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (filters.connection_type) {
      query = query.eq('connection_type', filters.connection_type)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error

    // Process connections to get the other user
    const processedConnections = (data || []).map(connection => {
      const otherUser = connection.requester_id === userId 
        ? connection.target 
        : connection.requester
      
      return {
        ...connection,
        connected_user: otherUser
      }
    })

    return processedConnections
  } catch (error) {
    console.error('Error getting user connections:', error)
    return []
  }
}

/**
 * Get pending connection requests for a user
 * @param {string} userId - User ID
 * @param {string} type - 'sent' or 'received'
 * @returns {Array} Array of connection requests
 */
export async function getConnectionRequests(userId, type = 'received') {
  try {
    let query = supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        target:profiles!connections_target_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('status', 'pending')

    if (type === 'sent') {
      query = query.eq('requester_id', userId)
    } else {
      query = query.eq('target_id', userId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting connection requests:', error)
    return []
  }
}

/**
 * Get connection statistics for a user
 * @param {string} userId - User ID
 * @returns {Object} Connection statistics
 */
export async function getConnectionStats(userId) {
  try {
    const [connectionsResult, mentorsResult, investorsResult] = await Promise.all([
      // Total connections
      supabase
        .from('connections')
        .select('id', { count: 'exact' })
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .eq('status', 'accepted'),
      
      // Connected mentors
      supabase
        .from('connections')
        .select(`
          id,
          target:profiles!connections_target_id_fkey(role),
          requester:profiles!connections_requester_id_fkey(role)
        `)
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .eq('status', 'accepted'),
      
      // Connected investors
      supabase
        .from('connections')
        .select(`
          id,
          target:profiles!connections_target_id_fkey(role),
          requester:profiles!connections_requester_id_fkey(role)
        `)
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .eq('status', 'accepted')
    ])

    const totalConnections = connectionsResult.count || 0
    
    // Count mentors and investors
    let mentorsCount = 0
    let investorsCount = 0
    
    if (mentorsResult.data) {
      mentorsResult.data.forEach(connection => {
        const otherUserRole = connection.requester_id === userId 
          ? connection.target?.role 
          : connection.requester?.role
        
        if (otherUserRole === 'mentor') mentorsCount++
        if (otherUserRole === 'investor') investorsCount++
      })
    }

    return {
      total_connections: totalConnections,
      mentors_count: mentorsCount,
      investors_count: investorsCount
    }
  } catch (error) {
    console.error('Error getting connection stats:', error)
    return {
      total_connections: 0,
      mentors_count: 0,
      investors_count: 0
    }
  }
}

/**
 * Remove a connection
 * @param {string} connectionId - Connection ID
 * @returns {Object} Result object
 */
export async function removeConnection(connectionId) {
  try {
    const authResult = await requireAuth()
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

    // Check if user is part of this connection
    if (connection.requester_id !== user.id && connection.target_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    // Delete connection
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId)

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'connection_removed', { 
      connection_id: connectionId,
      other_user_id: connection.requester_id === user.id ? connection.target_id : connection.requester_id
    })

    return { status: 200 }
  } catch (error) {
    console.error('Error removing connection:', error)
    return { error: 'Failed to remove connection', status: 500 }
  }
}