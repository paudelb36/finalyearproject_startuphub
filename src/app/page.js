'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [startups, setStartups] = useState([])
  const [updates, setUpdates] = useState([])
  const [events, setEvents] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      // Fetch recent startups
      const { data: startupsData } = await supabase
        .from('startup_profiles')
        .select(`
          *,
          profiles!startup_profiles_user_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(6)

      // Fetch recent updates
      const { data: updatesData } = await supabase
        .from('startup_updates')
        .select(`
          *,
          startup_profiles!startup_updates_startup_id_fkey(company_name, logo_url, slug)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(4)

      setStartups(startupsData || [])
      setUpdates(updatesData || [])
      setEvents(eventsData || [])
    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoadingData(false)
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
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
        <h1 className="text-5xl font-bold mb-6">
          Connect. Grow. Succeed.
        </h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          The ultimate platform connecting startups, mentors, and investors to build the future together.
        </p>
        {!user ? (
          <div className="space-x-4">
            <Link href="/auth/signup" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Get Started
            </Link>
            <Link href="/auth/signin" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Sign In
            </Link>
          </div>
        ) : (
          <Link href="/dashboard" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Go to Dashboard
          </Link>
        )}
      </section>

      {/* Featured Startups */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Startups</h2>
          <Link href="/startups" className="text-blue-600 hover:text-blue-800 font-semibold">
            View All →
          </Link>
        </div>
        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup) => (
              <Link key={startup.id} href={`/startups/${startup.slug}`} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex items-center mb-4">
                  {startup.logo_url && (
                    <Image
                      src={startup.logo_url}
                      alt={startup.company_name}
                      width={48}
                      height={48}
                      className="rounded-lg mr-3"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{startup.company_name}</h3>
                    <p className="text-gray-600 text-sm">{startup.industry}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{startup.tagline}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {startup.stage}
                  </span>
                  <span>{startup.location}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Updates */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Latest Updates</h2>
          <Link href="/feed" className="text-blue-600 hover:text-blue-800 font-semibold">
            View All →
          </Link>
        </div>
        {loadingData ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {updates.map((update) => (
              <div key={update.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  {update.startup_profiles?.logo_url && (
                    <Image
                      src={update.startup_profiles.logo_url}
                      alt={update.startup_profiles.company_name}
                      width={40}
                      height={40}
                      className="rounded-lg mr-3"
                    />
                  )}
                  <div>
                    <Link href={`/startups/${update.startup_profiles?.slug}`} className="font-semibold text-lg hover:text-blue-600">
                      {update.startup_profiles?.company_name}
                    </Link>
                    <p className="text-gray-500 text-sm">
                      {new Date(update.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-2">{update.title}</h3>
                <p className="text-gray-700">{update.content}</p>
                {update.milestone_type && (
                  <span className="inline-block mt-3 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {update.milestone_type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
          <Link href="/events" className="text-blue-600 hover:text-blue-800 font-semibold">
            View All →
          </Link>
        </div>
        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                    {event.event_type}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{event.description}</p>
                <div className="text-sm text-gray-500">
                  <p>📅 {new Date(event.start_date).toLocaleDateString()}</p>
                  <p>📍 {event.is_virtual ? 'Virtual' : event.location}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
