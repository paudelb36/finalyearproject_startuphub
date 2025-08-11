import { supabase } from '@/lib/supabase'
import { requireAuth, sendNotification, logActivity, checkRateLimit } from './auth'

/**
 * Get user's conversations
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Array of conversations
 */
export async function getConversations(userId, options = {}) {
  try {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        participant1:profiles!conversations_participant1_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        participant2:profiles!conversations_participant2_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        last_message:messages(
          id,
          content,
          created_at,
          sender_id
        )
      `)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query
    
    if (error) throw error

    // Process conversations to get the other participant and latest message
    const processedConversations = (data || []).map(conversation => {
      const otherParticipant = conversation.participant1_id === userId 
        ? conversation.participant2 
        : conversation.participant1
      
      return {
        ...conversation,
        other_participant: otherParticipant,
        latest_message: conversation.last_message?.[0] || null
      }
    })

    return processedConversations
  } catch (error) {
    console.error('Error getting conversations:', error)
    return []
  }
}

/**
 * Get or create conversation between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Object|null} Conversation data or null
 */
export async function getOrCreateConversation(userId1, userId2) {
  try {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`
        and(participant1_id.eq.${userId1},participant2_id.eq.${userId2}),
        and(participant1_id.eq.${userId2},participant2_id.eq.${userId1})
      `)
      .single()

    if (existing) {
      return existing
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant1_id: userId1,
        participant2_id: userId2
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting or creating conversation:', error)
    return null
  }
}

/**
 * Get messages in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} options - Query options
 * @returns {Array} Array of messages
 */
export async function getMessages(conversationId, options = {}) {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.before) {
      query = query.lt('created_at', options.before)
    }

    if (options.after) {
      query = query.gt('created_at', options.after)
    }

    const { data, error } = await query
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting messages:', error)
    return []
  }
}

/**
 * Send a message
 * @param {string} conversationId - Conversation ID
 * @param {string} content - Message content
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
export async function sendMessage(conversationId, content, options = {}) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Rate limiting - max 60 messages per minute per user
    const rateLimitKey = `messages:${user.id}`
    if (!checkRateLimit(rateLimitKey, 60, 60000)) {
      return { error: 'Rate limit exceeded. Please slow down.', status: 429 }
    }

    // Validate conversation exists and user is participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return { error: 'Conversation not found', status: 404 }
    }

    if (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return { error: 'Message content is required', status: 400 }
    }

    if (content.length > 2000) {
      return { error: 'Message too long (max 2000 characters)', status: 400 }
    }

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: options.message_type || 'text',
        metadata: options.metadata || {}
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    // Update conversation's last activity
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Send notification to other participant
    const otherParticipantId = conversation.participant1_id === user.id 
      ? conversation.participant2_id 
      : conversation.participant1_id

    await sendNotification(otherParticipantId, {
      type: 'new_message',
      title: 'New Message',
      message: `You have a new message from ${authResult.profile.full_name || 'someone'}`,
      metadata: { 
        conversation_id: conversationId, 
        message_id: data.id,
        sender_id: user.id
      }
    })

    // Log activity
    await logActivity(user.id, 'message_sent', { 
      conversation_id: conversationId,
      message_id: data.id,
      recipient_id: otherParticipantId
    })

    return { data, status: 201 }
  } catch (error) {
    console.error('Error sending message:', error)
    return { error: 'Failed to send message', status: 500 }
  }
}

/**
 * Start a new conversation
 * @param {string} recipientId - Recipient user ID
 * @param {string} initialMessage - Initial message content
 * @returns {Object} Result object
 */
export async function startConversation(recipientId, initialMessage) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Can't start conversation with yourself
    if (user.id === recipientId) {
      return { error: 'Cannot start conversation with yourself', status: 400 }
    }

    // Check if recipient exists
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipientId)
      .single()

    if (!recipient) {
      return { error: 'Recipient not found', status: 404 }
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(user.id, recipientId)
    if (!conversation) {
      return { error: 'Failed to create conversation', status: 500 }
    }

    // Send initial message if provided
    if (initialMessage && initialMessage.trim()) {
      const messageResult = await sendMessage(conversation.id, initialMessage)
      if (messageResult.error) {
        return messageResult
      }
      
      return { 
        data: { 
          conversation, 
          message: messageResult.data 
        }, 
        status: 201 
      }
    }

    return { data: { conversation }, status: 201 }
  } catch (error) {
    console.error('Error starting conversation:', error)
    return { error: 'Failed to start conversation', status: 500 }
  }
}

/**
 * Mark messages as read
 * @param {string} conversationId - Conversation ID
 * @param {Array} messageIds - Array of message IDs to mark as read
 * @returns {Object} Result object
 */
export async function markMessagesAsRead(conversationId, messageIds = []) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Validate conversation and user participation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return { error: 'Conversation not found', status: 404 }
    }

    if (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id) {
      return { error: 'Unauthorized', status: 403 }
    }

    let query = supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id) // Don't mark own messages as read

    if (messageIds.length > 0) {
      query = query.in('id', messageIds)
    }

    const { error } = await query

    if (error) throw error

    return { success: true, status: 200 }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return { error: 'Failed to mark messages as read', status: 500 }
  }
}

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Object} Result object
 */
export async function deleteMessage(messageId) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    // Get message details
    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (!message) {
      return { error: 'Message not found', status: 404 }
    }

    // Check if user is the sender
    if (message.sender_id !== user.id) {
      return { error: 'Can only delete your own messages', status: 403 }
    }

    // Soft delete - mark as deleted instead of actually deleting
    const { error } = await supabase
      .from('messages')
      .update({ 
        deleted: true, 
        deleted_at: new Date().toISOString(),
        content: '[Message deleted]'
      })
      .eq('id', messageId)

    if (error) throw error

    // Log activity
    await logActivity(user.id, 'message_deleted', { 
      message_id: messageId,
      conversation_id: message.conversation_id
    })

    return { success: true, status: 200 }
  } catch (error) {
    console.error('Error deleting message:', error)
    return { error: 'Failed to delete message', status: 500 }
  }
}

/**
 * Get unread message count for user
 * @param {string} userId - User ID
 * @returns {number} Unread message count
 */
export async function getUnreadMessageCount(userId) {
  try {
    // Get all conversations where user is a participant
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)

    if (!conversations || conversations.length === 0) {
      return 0
    }

    const conversationIds = conversations.map(c => c.id)

    // Count unread messages in these conversations
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId) // Not sent by the user
      .eq('read', false)
      .eq('deleted', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting unread message count:', error)
    return 0
  }
}

/**
 * Search messages
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Array of matching messages
 */
export async function searchMessages(userId, query, options = {}) {
  try {
    if (!query || query.trim().length < 2) {
      return []
    }

    // Get user's conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)

    if (!conversations || conversations.length === 0) {
      return []
    }

    const conversationIds = conversations.map(c => c.id)

    let supabaseQuery = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        conversation:conversations(
          id,
          participant1_id,
          participant2_id
        )
      `)
      .in('conversation_id', conversationIds)
      .ilike('content', `%${query.trim()}%`)
      .eq('deleted', false)
      .order('created_at', { ascending: false })

    if (options.limit) {
      supabaseQuery = supabaseQuery.limit(options.limit)
    }

    const { data, error } = await supabaseQuery
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching messages:', error)
    return []
  }
}

/**
 * Block/unblock user
 * @param {string} targetUserId - User ID to block/unblock
 * @param {boolean} block - Whether to block (true) or unblock (false)
 * @returns {Object} Result object
 */
export async function toggleUserBlock(targetUserId, block = true) {
  try {
    const authResult = await requireAuth()
    if (authResult.error) {
      return { error: authResult.error, status: authResult.status }
    }

    const { user } = authResult

    if (user.id === targetUserId) {
      return { error: 'Cannot block yourself', status: 400 }
    }

    if (block) {
      // Add to blocked users
      const { data, error } = await supabase
        .from('blocked_users')
        .upsert({
          blocker_id: user.id,
          blocked_id: targetUserId
        })
        .select()
        .single()

      if (error) throw error

      // Log activity
      await logActivity(user.id, 'user_blocked', { blocked_user_id: targetUserId })

      return { data, status: 201 }
    } else {
      // Remove from blocked users
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId)

      if (error) throw error

      // Log activity
      await logActivity(user.id, 'user_unblocked', { unblocked_user_id: targetUserId })

      return { success: true, status: 200 }
    }
  } catch (error) {
    console.error('Error toggling user block:', error)
    return { error: 'Failed to update block status', status: 500 }
  }
}

/**
 * Check if user is blocked
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {boolean} Whether either user has blocked the other
 */
export async function isUserBlocked(userId1, userId2) {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`
        and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),
        and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})
      `)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error checking if user is blocked:', error)
    return false
  }
}

/**
 * Get conversation statistics
 * @param {string} conversationId - Conversation ID
 * @returns {Object} Conversation statistics
 */
export async function getConversationStats(conversationId) {
  try {
    const [totalResult, unreadResult] = await Promise.all([
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .eq('deleted', false),
      
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .eq('read', false)
        .eq('deleted', false)
    ])

    return {
      totalMessages: totalResult.count || 0,
      unreadMessages: unreadResult.count || 0
    }
  } catch (error) {
    console.error('Error getting conversation stats:', error)
    return {
      totalMessages: 0,
      unreadMessages: 0
    }
  }
}