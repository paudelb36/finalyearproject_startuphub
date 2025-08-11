'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  })
  const [registrations, setRegistrations] = useState(new Set())

  useEffect(() => {
    fetchEvents()
    if (user) {
      fetchUserRegistrations()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [events, filters])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(full_name, role),
          registrations:event_registrations(count)
        `)
        .order('start_date', { ascending: true })

      if (error) throw error

      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)

      if (error) throw error

      const registeredEventIds = new Set(data.map(reg => reg.event_id))
      setRegistrations(registeredEventIds)
    } catch (error) {
      console.error('Error fetching user registrations:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...events]

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(event => event.event_type === filters.type)
    }

    // Filter by status
    if (filters.status !== 'all') {
      const now = new Date()
      if (filters.status === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.start_date) > now)
      } else if (filters.status === 'past') {
        filtered = filtered.filter(event => new Date(event.start_date) < now)
      }
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.organizer?.full_name.toLowerCase().includes(searchLower)
      )
    }

    setFilteredEvents(filtered)
  }

  const handleRegister = async (eventId) => {
    if (!user) {
      toast.error('Please sign in to register for events')
      return
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered'
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('You are already registered for this event')
        } else {
          throw error
        }
        return
      }

      setRegistrations(prev => new Set([...prev, eventId]))
      toast.success('Successfully registered for event!')
    } catch (error) {
      console.error('Error registering for event:', error)
      toast.error('Failed to register for event')
    }
  }

  const handleUnregister = async (eventId) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) throw error

      setRegistrations(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
      toast.success('Successfully unregistered from event')
    } catch (error) {
      console.error('Error unregistering from event:', error)
      toast.error('Failed to unregister from event')
    }
  }

  const getEventStatus = (eventDate) => {
    const now = new Date()
    const event = new Date(eventDate)
    
    if (event > now) {
      return { status: 'upcoming', color: 'bg-green-100 text-green-800' }
    } else {
      return { status: 'past', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-2">Discover and join startup events, pitch competitions, and webinars</p>
          </div>
          {user && (
            <Link
              href="/events/create"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Event
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Event Type Filter */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="pitch_event">Pitch Events</option>
              <option value="webinar">Webinars</option>
              <option value="networking">Networking</option>
              <option value="workshop">Workshops</option>
              <option value="conference">Conferences</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const eventStatus = getEventStatus(event.start_date)
                const formattedDate = formatEventDate(event.start_date)
            const isRegistered = registrations.has(event.id)
            const isPastEvent = eventStatus.status === 'past'
            
            return (
              <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Event Image */}
                {event.image_url && (
                  <div className="h-48 relative">
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  {/* Event Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventStatus.color}`}>
                        {eventStatus.status}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                        {event.event_type.replace('_', ' ')}
                      </span>
                    </div>
                    {event.is_paid && (
                      <span className="text-green-600 font-semibold text-sm">
                        ${event.price}
                      </span>
                    )}
                  </div>
                  
                  {/* Event Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  
                  {/* Event Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {event.description}
                  </p>
                  
                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">📅</span>
                      <span>{formattedDate.date} at {formattedDate.time}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">📍</span>
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">👤</span>
                      <span>Organized by {event.organizer?.full_name}</span>
                    </div>
                    
                    {event.max_participants && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">👥</span>
                        <span>
                          {event.registrations?.[0]?.count || 0} / {event.max_participants} participants
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-center hover:bg-gray-200 transition-colors"
                    >
                      View Details
                    </Link>
                    
                    {user && !isPastEvent && (
                      isRegistered ? (
                        <button
                          onClick={() => handleUnregister(event.id)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Unregister
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(event.id)}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          disabled={event.max_participants && (event.registrations?.[0]?.count || 0) >= event.max_participants}
                        >
                          {event.max_participants && (event.registrations?.[0]?.count || 0) >= event.max_participants
                            ? 'Full'
                            : event.is_paid
                            ? `Register - $${event.price}`
                            : 'Register'
                          }
                        </button>
                      )
                    )}
                    
                    {!user && !isPastEvent && (
                      <Link
                        href="/auth/signin"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors"
                      >
                        Sign In to Register
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600 mb-6">
            {filters.search || filters.type !== 'all' || filters.status !== 'all'
              ? 'Try adjusting your filters to see more events.'
              : 'No events are currently available. Check back later!'}
          </p>
          {user && (
            <Link
              href="/events/create"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Create the First Event
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{events.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => getEventStatus(e.start_date).status === 'upcoming').length}
              </div>
              <div className="text-sm text-gray-600">Upcoming</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {events.filter(e => e.event_type === 'pitch_event').length}
              </div>
              <div className="text-sm text-gray-600">Pitch Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.event_type === 'webinar').length}
              </div>
              <div className="text-sm text-gray-600">Webinars</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}