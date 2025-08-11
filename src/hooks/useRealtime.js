'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Hook for managing real-time subscriptions to Supabase tables
 * @param {string} table - The table name to subscribe to
 * @param {Object} options - Subscription options
 * @param {string} options.event - The event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param {string} options.filter - Optional filter for the subscription
 * @param {Function} options.callback - Callback function to handle changes
 * @param {Array} dependencies - Dependencies array for useEffect
 */
export const useRealtime = (table, options = {}, dependencies = []) => {
  const {
    event = '*',
    filter,
    callback
  } = options

  const subscriptionRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!table || !callback) return

    // Create a unique channel name
    const channelName = `realtime-${table}-${Date.now()}-${Math.random()}`
    
    // Create the channel
    const channel = supabase.channel(channelName)
    channelRef.current = channel

    // Configure the subscription
    const subscriptionConfig = {
      event,
      schema: 'public',
      table
    }

    if (filter) {
      subscriptionConfig.filter = filter
    }

    // Subscribe to changes
    channel.on('postgres_changes', subscriptionConfig, callback)

    // Subscribe to the channel
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${table} changes`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to ${table} changes`)
      }
    })

    subscriptionRef.current = subscription

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      subscriptionRef.current = null
    }
  }, [table, event, filter, callback, ...dependencies])

  // Return cleanup function for manual cleanup if needed
  const cleanup = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    subscriptionRef.current = null
  }

  return { cleanup }
}

/**
 * Hook for subscribing to messages in real-time
 * @param {string} conversationId - The conversation ID to subscribe to
 * @param {Function} onMessage - Callback when new message is received
 * @param {string} userId - Current user ID
 */
export const useRealtimeMessages = (conversationId, onMessage, userId) => {
  const callback = async (payload) => {
    if (payload.eventType === 'INSERT') {
      // Fetch the complete message with sender info
      const { data: newMessage } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', payload.new.id)
        .single()

      if (newMessage && onMessage) {
        onMessage(newMessage)
      }
    }
  }

  const filter = conversationId ? 
    `or(and(sender_id.eq.${conversationId.split('-')[0]},recipient_id.eq.${conversationId.split('-')[1]}),and(sender_id.eq.${conversationId.split('-')[1]},recipient_id.eq.${conversationId.split('-')[0]}))` 
    : undefined

  return useRealtime('messages', {
    event: 'INSERT',
    filter,
    callback
  }, [conversationId, userId])
}

/**
 * Hook for subscribing to notifications in real-time
 * @param {string} userId - User ID to subscribe to notifications for
 * @param {Function} onNotification - Callback when new notification is received
 */
export const useRealtimeNotifications = (userId, onNotification) => {
  const callback = (payload) => {
    if (payload.eventType === 'INSERT' && onNotification) {
      onNotification(payload.new)
    }
  }

  return useRealtime('notifications', {
    event: 'INSERT',
    filter: `user_id=eq.${userId}`,
    callback
  }, [userId])
}

/**
 * Hook for subscribing to connection requests in real-time
 * @param {string} userId - User ID to subscribe to connection requests for
 * @param {Function} onConnectionRequest - Callback when new connection request is received
 */
export const useRealtimeConnections = (userId, onConnectionRequest) => {
  const callback = async (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      // Fetch the complete connection with user info
      const { data: connection } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, role),
          recipient:profiles!connections_recipient_id_fkey(id, full_name, avatar_url, role)
        `)
        .eq('id', payload.new.id)
        .single()

      if (connection && onConnectionRequest) {
        onConnectionRequest(connection, payload.eventType)
      }
    }
  }

  return useRealtime('connections', {
    event: '*',
    filter: `or(requester_id=eq.${userId},recipient_id=eq.${userId})`,
    callback
  }, [userId])
}

/**
 * Hook for subscribing to startup updates in real-time
 * @param {string} startupId - Startup ID to subscribe to updates for
 * @param {Function} onUpdate - Callback when new update is posted
 */
export const useRealtimeStartupUpdates = (startupId, onUpdate) => {
  const callback = async (payload) => {
    if (payload.eventType === 'INSERT') {
      // Fetch the complete update
      const { data: update } = await supabase
        .from('startup_updates')
        .select('*')
        .eq('id', payload.new.id)
        .single()

      if (update && onUpdate) {
        onUpdate(update)
      }
    }
  }

  return useRealtime('startup_updates', {
    event: 'INSERT',
    filter: startupId ? `startup_id=eq.${startupId}` : undefined,
    callback
  }, [startupId])
}

/**
 * Hook for subscribing to event registrations in real-time
 * @param {string} eventId - Event ID to subscribe to registrations for
 * @param {Function} onRegistration - Callback when new registration is made
 */
export const useRealtimeEventRegistrations = (eventId, onRegistration) => {
  const callback = async (payload) => {
    if (payload.eventType === 'INSERT') {
      // Fetch the complete registration with user info
      const { data: registration } = await supabase
        .from('event_registrations')
        .select(`
          *,
          user:profiles!event_registrations_user_id_fkey(id, full_name, avatar_url, role)
        `)
        .eq('id', payload.new.id)
        .single()

      if (registration && onRegistration) {
        onRegistration(registration)
      }
    }
  }

  return useRealtime('event_registrations', {
    event: 'INSERT',
    filter: eventId ? `event_id=eq.${eventId}` : undefined,
    callback
  }, [eventId])
}

export default useRealtime