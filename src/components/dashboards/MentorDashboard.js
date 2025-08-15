'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStore, useLoadingState } from '@/lib/store'
import { supabase, generateSlug } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { fetchEssentialData, fetchSecondaryData, fetchTertiaryData } from '@/lib/services/dashboardDataService'
import { getMentorshipRequests, respondToMentorshipRequest } from '@/lib/api/requests'
import { getUserConnections, getConnectionStats } from '@/lib/api/connections'
import { getUserEventRegistrations, cancelEventRegistration } from '@/lib/api/eventRegistration'
import { RecommendationCardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function MentorDashboard({ profile }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Progressive loading states
  const [essentialData, setEssentialData] = useState(null)
  const [secondaryData, setSecondaryData] = useState(null)
  const [tertiaryData, setTertiaryData] = useState(null)
  const [essentialLoading, setEssentialLoading] = useState(true)
  const [secondaryLoading, setSecondaryLoading] = useState(true)
  const [tertiaryLoading, setTertiaryLoading] = useState(true)
  
  // Legacy states for compatibility
  const [stats, setStats] = useState({
    connections: 0,
    mentorshipRequests: 0,
    activeMentorships: 0,
    totalEarnings: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [mentorshipRequests, setMentorshipRequests] = useState([])
  const [activeMentorships, setActiveMentorships] = useState([])
  const [connections, setConnections] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  // Registered events are now handled by tertiaryData
  const [activeTab, setActiveTab] = useState('overview')
  const getRecommendations = useStore((state) => state.getRecommendations)
  const [recs, setRecs] = useState([])
  const { loading: recsLoading } = useLoadingState('recommendations', user?.id ? `${user.id}_8` : 'anonymous_8')
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')

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

  // Event fetching is now handled by the data service

  // Stats are now handled by the data service

  // Mentorship requests and connections are now handled by the data service

  // Recent activity is now handled by the data service

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await respondToMentorshipRequest(requestId, action, responseMessage)
      toast.success(`Request ${action} successfully`)
      setRespondingTo(null)
      setResponseMessage('')
      await fetchMentorshipRequests()
      await fetchStats()
    } catch (error) {
      console.error('Error responding to request:', error)
      toast.error(error.message || `Failed to ${action} request`)
    }
  }

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
      default: return '📝'
    }
  }

  const renderOverview = () => (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || 'Mentor'}!
          </h1>
          <p className="text-gray-700 mt-1">
            Here&apos;s your mentor dashboard overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Mentor Profile Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16">
                <Image
                  src={profile?.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" rx="32" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28" fill="%236b7280">👤</text></svg>'}
                  alt={profile?.full_name || 'Avatar'}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <Link href="/profiles" className="text-2xl font-bold text-gray-900 hover:underline">
                  {profile?.full_name || 'Your Name'}
                </Link>
                <p className="text-gray-700 mt-1">
                  {profile?.roleSpecificData?.expertise || 'Add your expertise'}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  {profile?.roleSpecificData?.experience_years ? 
                    `${profile.roleSpecificData.experience_years} years experience` : 
                    'Add experience'
                  }
                </p>
                <p className="text-gray-600 text-sm">
                  {profile?.location || 'Add location'}
                </p>
                {profile?.roleSpecificData?.hourly_rate && (
                  <p className="text-green-600 font-semibold mt-2">
                    Rs. {profile.roleSpecificData.hourly_rate}/hour
                  </p>
                )}
                <p className="text-gray-700 mt-4">
                  {profile?.bio || 'Add your bio'}
                </p>
              </div>
              {/* Edit button removed; name links to profile page */}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {tertiaryLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading...</p>
              </div>
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
                  Start connecting with startups
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
            <div className="text-yellow-600 text-2xl mb-2">📋</div>
            <div className="text-2xl font-bold text-gray-900">{essentialLoading ? '...' : essentialData?.stats?.mentorshipRequests || 0}</div>
            <div className="text-sm text-gray-700">Pending Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-green-600 text-2xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900">{essentialLoading ? '...' : essentialData?.stats?.activeMentorships || 0}</div>
            <div className="text-sm text-gray-700">Active Mentorships</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-purple-600 text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {essentialLoading ? '...' : (essentialData?.stats?.totalEarnings || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">Total Earnings</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMentorshipRequests = () => (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Requests</h3>
        {secondaryLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : secondaryData?.requests?.mentorship?.filter(req => req.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.mentorship.filter(req => req.status === 'pending').map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      Request from {request.startup?.profiles?.full_name}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Company: {request.startup?.company_name}
                    </p>
                    <p className="text-gray-700 mt-2">{request.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Received on {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setRespondingTo({ ...request, action: 'accepted' })}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setRespondingTo({ ...request, action: 'rejected' })}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No pending requests</p>
        )}
      </div>

      {/* Active Mentorships */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Active Mentorships</h3>
        {secondaryLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : secondaryData?.requests?.mentorship?.filter(req => req.status === 'accepted').length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.mentorship.filter(req => req.status === 'accepted').map((mentorship) => (
              <div key={mentorship.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {mentorship.startup?.profiles?.full_name}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Company: {mentorship.startup?.company_name}
                    </p>
                    <p className="text-gray-700 mt-2">{mentorship.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Started on {new Date(mentorship.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-100">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No active mentorships</p>
        )}
      </div>
    </div>
  )

  const renderConnections = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Connections</h3>
      {secondaryLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
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

  const handleContactRecommendation = (recommendation, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const subject = `Mentorship Inquiry from ${profile?.full_name}`
    const body = `Hi ${recommendation.title},\n\nI'm ${profile?.full_name}, a mentor on our startup platform. I came across your ${recommendation.type === 'startup' ? 'startup' : 'profile'} and would love to connect.\n\n${recommendation.type === 'startup' ? `I'm interested in potentially mentoring your team at ${recommendation.title}. I have expertise in areas that might be valuable for your ${recommendation.stage || 'current'} stage.` : 'I\'d like to explore potential collaboration opportunities.'}\n\nBest regards,\n${profile?.full_name}\n${profile?.roleSpecificData?.company || ''}`
    
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
                    {r.stage && (
                      <p className="text-xs text-blue-600 mt-1">{r.stage} stage</p>
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
            { id: 'requests', name: 'Mentorship Requests' },
            { id: 'connections', name: 'Connections' },
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
      {activeTab === 'requests' && renderMentorshipRequests()}
      {activeTab === 'connections' && renderConnections()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'recommendations' && renderRecommendations()}

      {/* Response Modal */}
      {respondingTo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {respondingTo.action === 'accepted' ? 'Accept' : 'Reject'} Mentorship Request
            </h3>
            <p className="text-gray-700 mb-4">
              Request from {respondingTo.startup?.profiles?.full_name}
            </p>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Optional message to the startup..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={4}
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => handleRespondToRequest(respondingTo.id, respondingTo.action)}
                className={`flex-1 px-4 py-2 rounded-lg text-white ${
                  respondingTo.action === 'accepted'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {respondingTo.action === 'accepted' ? 'Accept' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setRespondingTo(null)
                  setResponseMessage('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}