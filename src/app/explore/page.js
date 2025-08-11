'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('startups')
  const [startups, setStartups] = useState([])
  const [mentors, setMentors] = useState([])
  const [investors, setInvestors] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'startups':
          await fetchStartups()
          break
        case 'mentors':
          await fetchMentors()
          break
        case 'investors':
          await fetchInvestors()
          break
        case 'events':
          await fetchEvents()
          break
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStartups = async () => {
    const { data, error } = await supabase
      .from('startup_profiles')
      .select(`
        *,
        profiles!startup_profiles_user_id_fkey(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    setStartups(data || [])
  }

  const fetchMentors = async () => {
    const { data, error } = await supabase
      .from('mentor_profiles')
      .select(`
        *,
        profiles!mentor_profiles_user_id_fkey(full_name, avatar_url, bio)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    setMentors(data || [])
  }

  const fetchInvestors = async () => {
    const { data, error } = await supabase
      .from('investor_profiles')
      .select(`
        *,
        profiles!investor_profiles_user_id_fkey(full_name, avatar_url, bio)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    setInvestors(data || [])
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(20)

    if (error) throw error
    setEvents(data || [])
  }

  const filteredData = () => {
    const searchLower = searchTerm.toLowerCase()
    switch (activeTab) {
      case 'startups':
        return startups.filter(startup => 
          startup.company_name?.toLowerCase().includes(searchLower) ||
          startup.industry?.toLowerCase().includes(searchLower) ||
          startup.description?.toLowerCase().includes(searchLower)
        )
      case 'mentors':
        return mentors.filter(mentor => 
          mentor.profiles?.full_name?.toLowerCase().includes(searchLower) ||
          mentor.company?.toLowerCase().includes(searchLower) ||
          mentor.job_title?.toLowerCase().includes(searchLower)
        )
      case 'investors':
        return investors.filter(investor => 
          investor.profiles?.full_name?.toLowerCase().includes(searchLower) ||
          investor.fund_name?.toLowerCase().includes(searchLower)
        )
      case 'events':
        return events.filter(event => 
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower)
        )
      default:
        return []
    }
  }

  const tabs = [
    { id: 'startups', name: 'Startups', icon: '🚀' },
    { id: 'mentors', name: 'Mentors', icon: '🎯' },
    { id: 'investors', name: 'Investors', icon: '💰' },
    { id: 'events', name: 'Events', icon: '📅' }
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore</h1>
          <p className="text-gray-600">Discover startups, mentors, investors, and events in our ecosystem</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xl">🔍</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'startups' && filteredData().map((startup) => (
              <Link key={startup.id} href={`/profile/${startup.user_id}`}>
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {startup.logo_url ? (
                        <Image
                          src={startup.logo_url}
                          alt={startup.company_name}
                          width={48}
                          height={48}
                          className="rounded-lg"
                        />
                      ) : (
                        <span className="text-xl">🚀</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{startup.company_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{startup.tagline}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{startup.description}</p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>📍 {startup.location}</span>
                        <span>🏢 {startup.industry}</span>
                        <span>📈 {startup.stage}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {activeTab === 'mentors' && filteredData().map((mentor) => (
              <Link key={mentor.id} href={`/profile/${mentor.user_id}`}>
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {mentor.profiles?.avatar_url ? (
                        <Image
                          src={mentor.profiles.avatar_url}
                          alt={mentor.profiles.full_name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{mentor.profiles?.full_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{mentor.job_title} at {mentor.company}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{mentor.profiles?.bio}</p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>⏰ {mentor.availability}</span>
                        <span>💼 {mentor.years_experience}+ years</span>
                        {mentor.is_paid && <span>💰 Paid</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {activeTab === 'investors' && filteredData().map((investor) => (
              <Link key={investor.id} href={`/profile/${investor.user_id}`}>
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {investor.profiles?.avatar_url ? (
                        <Image
                          src={investor.profiles.avatar_url}
                          alt={investor.profiles.full_name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-xl">💰</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{investor.profiles?.full_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{investor.fund_name}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{investor.profiles?.bio}</p>
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>💵 ${investor.ticket_size_min?.toLocaleString()} - ${investor.ticket_size_max?.toLocaleString()}</span>
                        <span>🏢 {investor.portfolio_companies} companies</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {activeTab === 'events' && filteredData().map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3">{event.description}</p>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>⏰</span>
                    <span>{new Date(event.start_date).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>📍</span>
                    <span>{event.location || 'Online'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🎯</span>
                    <span className="capitalize">{event.event_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredData().length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No {activeTab} found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  )
}