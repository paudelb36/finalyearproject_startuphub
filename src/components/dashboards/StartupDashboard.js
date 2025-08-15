'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStore, useLoadingState } from '@/lib/store'
import { supabase, generateSlug } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { fetchEssentialData, fetchSecondaryData, fetchTertiaryData } from '@/lib/services/dashboardDataService'
import { getUserEventRegistrations, cancelEventRegistration } from '@/lib/api/eventRegistration'
import { RecommendationCardSkeleton, ListSkeleton } from '@/components/ui/LoadingSkeleton'

export default function StartupDashboard({ profile }) {
  const { user } = useAuth()
  // Progressive loading states
  const [essentialData, setEssentialData] = useState(null)
  const [secondaryData, setSecondaryData] = useState(null)
  const [tertiaryData, setTertiaryData] = useState(null)
  const [essentialLoading, setEssentialLoading] = useState(true)
  const [secondaryLoading, setSecondaryLoading] = useState(true)
  const [tertiaryLoading, setTertiaryLoading] = useState(true)
  
  // Legacy state for compatibility
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  // Registered events are now handled by tertiaryData
  const ITEMS_PER_PAGE = 10
  const getRecommendations = useStore((state) => state.getRecommendations)
  const [recs, setRecs] = useState([])
  const { loading: recsLoading } = useLoadingState('recommendations', user?.id ? `${user.id}_8` : 'anonymous_8')

  useEffect(() => {
    if (user && profile) {
      fetchDashboardData()
    }
  }, [user, profile])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(false) // Show dashboard immediately
      
      // Progressive loading: Essential data first
      setEssentialLoading(true)
      const essential = await fetchEssentialData(user, profile)
      setEssentialData(essential)
      setEssentialLoading(false)
      
      // Secondary data
      setSecondaryLoading(true)
      const secondary = await fetchSecondaryData(user, profile)
      setSecondaryData(secondary)
      setSecondaryLoading(false)
      
      // Tertiary data (non-critical)
      setTertiaryLoading(true)
      const tertiary = await fetchTertiaryData(user, profile)
      setTertiaryData(tertiary)
      setTertiaryLoading(false)
      
      // Legacy event fetching
      // Events are now loaded as part of tertiary data
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
      setEssentialLoading(false)
      setSecondaryLoading(false)
      setTertiaryLoading(false)
    }
  }, [user?.id, profile?.roleSpecificData?.id])

  // Recommendations are now handled by the data service

  // Conversations are now handled by the data service

  // Event fetching is now handled by the data service

  // Stats are now handled by the data service

  // Requests are now handled by the data service

  // Connections are now handled by the data service

  // Recent activity is now handled by the data service

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'connection': return '🤝'
      case 'mentorship': return '🎯'
      case 'investment': return '💰'
      default: return '📝'
    }
  }

  const renderOverview = () => (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || 'Founder'}!
          </h1>
          <p className="text-gray-700 mt-1">
            Here&apos;s your startup dashboard overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Startup Profile Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                {profile?.roleSpecificData?.logo_url ? (
                  <Image
                    src={profile.roleSpecificData.logo_url}
                    alt={profile.roleSpecificData.company_name || 'Company'}
                    width={64}
                    height={64}
                    className="rounded-lg"
                  />
                ) : (
                  <span className="text-2xl">🏢</span>
                )}
              </div>
              <div className="flex-1">
                <Link href="/profiles" className="text-2xl font-bold text-gray-900 hover:underline">
                  {profile?.roleSpecificData?.company_name || 'Your Startup'}
                </Link>
                <p className="text-gray-700 mt-1">
                  {profile?.roleSpecificData?.tagline || 'Add your tagline'}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  {profile?.roleSpecificData?.location || 'Add location'}
                </p>
                <p className="text-gray-700 mt-4">
                  {profile?.roleSpecificData?.description || 'Add company description'}
                </p>
              </div>
              {/* Edit button removed; name links to profile page */}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {tertiaryLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : tertiaryData?.recentActivity?.length > 0 ? (
              <div className="space-y-3">
                {tertiaryData.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="bg-gray-100 p-2 rounded-full">
                        <span>{getActivityIcon(activity.type)}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.time).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No recent activity</p>
                <p className="text-sm text-gray-500 mt-1">
                  Start connecting with mentors and investors
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-blue-600 text-2xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-900">{essentialLoading ? '...' : essentialData?.stats?.connections || 0}</div>
            <div className="text-sm text-gray-700">Connections</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-purple-600 text-2xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900">{essentialLoading ? '...' : essentialData?.stats?.mentorshipRequests || 0}</div>
            <div className="text-sm text-gray-700">Mentorship Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-green-600 text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">{essentialLoading ? '...' : essentialData?.stats?.investmentRequests || 0}</div>
            <div className="text-sm text-gray-700">Investment Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-orange-600 text-2xl mb-2">💵</div>
            <div className="text-2xl font-bold text-gray-900">
              {essentialLoading ? '...' : essentialData?.stats?.fundingRaised ? `Rs. ${essentialData.stats.fundingRaised.toLocaleString()}` : 'Rs. 0'}
            </div>
            <div className="text-sm text-gray-700">Funding Raised</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRequests = () => (
    <div className="space-y-6">
      {/* Mentorship Requests */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Mentorship Requests</h3>
        {secondaryLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : secondaryData?.requests?.mentorship?.length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.mentorship.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Request to {request.mentor?.profiles?.full_name}
                    </h4>
                    <p className="text-gray-700 mt-1">{request.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Sent on {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No mentorship requests yet</p>
        )}
      </div>

      {/* Investment Requests */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Investment Requests</h3>
        {secondaryLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : secondaryData?.requests?.investment?.length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.investment.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Request to {request.investor?.profiles?.full_name}
                    </h4>
                    <p className="text-gray-700 mt-1">{request.message}</p>
                    {request.pitch_deck_url && (
                      <a
                        href={request.pitch_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      >
                        View Pitch Deck
                      </a>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Sent on {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No investment requests yet</p>
        )}
      </div>
    </div>
  )

  const renderConnections = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Connections</h3>
      {secondaryLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : secondaryData?.connections?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secondaryData.connections.map((connection) => (
            <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {connection.connected_user?.avatar_url ? (
                    <Image
                      src={connection.connected_user.avatar_url}
                      alt={connection.connected_user.full_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">
                      {connection.connected_user?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {connection.connected_user?.full_name}
                  </h4>
                  <p className="text-sm text-gray-700 capitalize">
                    {connection.connected_user?.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No connections yet</p>
      )}
    </div>
  )

  const handleContactRecommendation = (recommendation, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const subject = `Connection Request from ${profile?.roleSpecificData?.company_name || profile?.full_name}`
    const body = `Hi ${recommendation.title},\n\nI found your profile through our startup platform and would love to connect. \n\n${recommendation.type === 'mentor' ? 'I\'m interested in your mentorship and expertise in ' + (recommendation.description.split('•')[0] || 'your field') + '.' : 'I\'d like to explore potential collaboration opportunities.'}\n\nBest regards,\n${profile?.full_name}\n${profile?.roleSpecificData?.company_name || ''}`
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, '_blank')
  }

  const renderRecommendations = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
      {tertiaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <RecommendationCardSkeleton key={i} />
          ))}
        </div>
      ) : tertiaryData?.recommendations?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tertiaryData.recommendations.map((r) => (
            <div key={r.id || Math.random()} className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <Link href={r.link || '#'} className="block">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12">
                    <Image
                      src={r.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="24" fill="%23e5e7eb"/></svg>'}
                      alt={r.title || 'User'}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 hover:text-blue-600">{r.title || 'User'}</h4>
                    <p className="text-sm text-gray-700">{r.description}</p>
                    {r.location && (
                      <p className="text-xs text-gray-500 mt-1">📍 {r.location}</p>
                    )}
                    {r.rate && (
                      <p className="text-xs text-green-600 mt-1">${r.rate}/hour</p>
                    )}
                  </div>
                </div>
              </Link>
              <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100">
                <Link 
                  href={r.link || '#'} 
                  className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  View Profile
                </Link>
                <button
                  onClick={(e) => handleContactRecommendation(r, e)}
                  className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-3 rounded-md text-sm hover:bg-gray-200 transition-colors"
                >
                  📧 Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No recommendations yet</p>
      )}
    </div>
  )


  const renderMessages = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Messages</h3>
      {tertiaryLoading ? (
        <p className="text-gray-600">Loading conversations...</p>
      ) : tertiaryData?.conversations?.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {tertiaryData.conversations.map((conv) => {
            const other = conv.participant1_id === user.id ? conv.participant2 : conv.participant1
            return (
              <Link key={conv.id || Math.random()} href={`/messages?user=${other?.id || 'unknown'}`} className="flex items-center py-3 hover:bg-gray-50 px-2 rounded">
                <div className="w-10 h-10 mr-3">
                  <Image
                    src={other?.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><rect width=\"100%\" height=\"100%\" rx=\"20\" fill=\"%23e5e7eb\"/></svg>'}
                    alt={other?.full_name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium truncate">{other?.full_name || 'User'}</p>
                  <p className="text-sm text-gray-600 truncate">{conv.last_message || 'Open conversation'}</p>
                </div>
                <span className="text-xs text-gray-500 ml-3">
                  {new Date(conv.updated_at || conv.created_at).toLocaleDateString()}
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-600">No conversations yet</p>
      )}
      <div className="mt-4">
        <Link href="/messages" className="text-blue-600 hover:text-blue-800">Open Messages</Link>
      </div>
    </div>
  )

  const renderEvents = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
        <Link 
          href="/explore?tab=events" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Events
        </Link>
      </div>

      {tertiaryLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : tertiaryData?.events?.length > 0 ? (
        <div className="space-y-4">
          {tertiaryData.events.map((registration) => {
            const event = registration.event
            const isUpcoming = new Date(event.start_date) > new Date()
            const isPast = new Date(event.end_date) < new Date()
            
            return (
              <div key={registration.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isUpcoming ? 'bg-green-100 text-green-800' : 
                        isPast ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isUpcoming ? 'Upcoming' : isPast ? 'Past' : 'Ongoing'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                    {event.google_meet_link && isUpcoming && (
                      <div className="mt-3">
                        <a 
                          href={event.google_meet_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          🔗 Join Meeting
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {isUpcoming && (
                      <button
                        onClick={async () => {
                          try {
                            const result = await cancelEventRegistration(event.id)
                            if (result.error) {
                              toast.error(result.error)
                            } else {
                              toast.success('Registration cancelled')
                              // Refresh tertiary data to update events
                              const newTertiaryData = await fetchTertiaryData(user, profile)
                              setTertiaryData(newTertiaryData)
                            }
                          } catch (error) {
                            toast.error('Failed to cancel registration')
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Registered</h3>
          <p className="text-gray-600 mb-4">You haven&apos;t registered for any events yet.</p>
          <Link 
            href="/explore?tab=events" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Available Events
          </Link>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'requests', name: 'Requests' },
            { id: 'connections', name: 'Connections' },
            { id: 'messages', name: 'Messages' },
            { id: 'events', name: 'Events' },
            { id: 'recommendations', name: 'Recommendations' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'connections' && renderConnections()}
      {activeTab === 'messages' && renderMessages()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'recommendations' && renderRecommendations()}
    </div>
  )
}