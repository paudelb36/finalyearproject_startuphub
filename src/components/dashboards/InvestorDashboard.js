'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStore, useLoadingState } from '@/lib/store'
import { supabase, generateSlug } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { getInvestmentRequests, respondToInvestmentRequest } from '@/lib/api/requests'
import { getUserConnections, getConnectionStats } from '@/lib/api/connections'
import { getUserEventRegistrations, cancelEventRegistration } from '@/lib/api/eventRegistration'
import { RecommendationCardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function InvestorDashboard({ profile }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    connections: 0,
    investmentRequests: 0,
    activeInvestments: 0,
    totalInvested: 0
  })
  const [investmentRequests, setInvestmentRequests] = useState([])
  const [activeInvestments, setActiveInvestments] = useState([])
  const [connections, setConnections] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [registeredEvents, setRegisteredEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
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

  const fetchDashboardData = async () => {
    try {
      setLoading(false) // Show dashboard immediately
      // Load data independently without blocking UI
      fetchStats()
      fetchInvestmentRequests()
      fetchConnections()
      fetchRecentActivity()
      fetchRecommendations()
      fetchRegisteredEvents()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    }
  }

  const fetchRecommendations = async () => {
    try {
      const recommendations = await getRecommendations(user.id, 8)
      setRecs(recommendations || [])
    } catch (e) {
      console.error('fetchRecommendations error:', e)
      setRecs([])
    }
  }

  const fetchRegisteredEvents = async () => {
    try {
      setEventsLoading(true)
      const result = await getUserEventRegistrations(user.id)
      if (result.error) {
        console.error('Error fetching registered events:', result.error)
        setRegisteredEvents([])
      } else {
        setRegisteredEvents(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching registered events:', error)
      setRegisteredEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const connectionStats = await getConnectionStats(user.id)
      
      // Get investment request stats
      const { data: investmentStats } = await supabase
        .from('investment_requests')
        .select('status')
        .eq('investor_id', user.id)

      const pendingRequests = investmentStats?.filter(req => req.status === 'pending').length || 0
      const activeInvestments = investmentStats?.filter(req => req.status === 'accepted').length || 0

      setStats({
        connections: connectionStats.total_connections || 0,
        investmentRequests: pendingRequests,
        activeInvestments,
        totalInvested: 0 // This would come from a transactions table
      })
    } catch (error) {
      console.error('Error fetching stats:', error?.message || error)
    }
  }

  const fetchInvestmentRequests = async () => {
    try {
      const response = await getInvestmentRequests(user.id, 'received')
      const requests = response?.data || []
      setInvestmentRequests(requests)
      
      const accepted = requests.filter(req => req.status === 'accepted') || []
      setActiveInvestments(accepted)
    } catch (error) {
      console.error('Error fetching investment requests:', error?.message || error)
      setInvestmentRequests([])
      setActiveInvestments([])
    }
  }

  const fetchConnections = async () => {
    try {
      const connectionsData = await getUserConnections(user.id)
      setConnections(connectionsData || [])
    } catch (error) {
      console.error('Error fetching connections:', error?.message || error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const activities = []

      // Recent connections
      const { data: recentConnections } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!requester_id(full_name),
          target:profiles!target_id(full_name)
        `)
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5)

      recentConnections?.forEach((conn) => {
        const isRequester = conn.requester_id === user.id
        activities.push({
          id: `conn-${conn.id}`,
          type: 'connection',
          title: isRequester
            ? `Connected with ${conn.target.full_name}`
            : `${conn.requester.full_name} connected with you`,
          time: conn.created_at,
          status: conn.status
        })
      })

      // Recent investment requests
      const { data: recentRequests } = await supabase
        .from('investment_requests')
        .select(`
          *,
          startup:profiles!startup_id(
            id,
            full_name
          )
        `)
        .eq('investor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      recentRequests?.forEach((req) => {
        activities.push({
          id: `invest-${req.id}`,
          type: 'investment',
          title: `Investment request from ${req.startup.profiles.full_name}`,
          time: req.created_at,
          status: req.status
        })
      })

      // Sort by time and take latest 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time))
      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching recent activity:', error?.message || error)
    }
  }

  const handleRespondToRequest = async (requestId, action) => {
    try {
      await respondToInvestmentRequest(requestId, action, responseMessage)
      toast.success(`Request ${action} successfully`)
      setRespondingTo(null)
      setResponseMessage('')
      await fetchInvestmentRequests()
      await fetchStats()
    } catch (error) {
      console.error('Error responding to request:', error?.message || error)
      toast.error(error?.message || `Failed to ${action} request`)
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
      case 'investment': return '💰'
      default: return '📝'
    }
  }

  const renderOverview = () => (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.full_name || 'Investor'}!
          </h1>
          <p className="text-gray-700 mt-1">
            Here&apos;s your investor dashboard overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Investor Profile Card */}
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
                  {profile?.roleSpecificData?.investment_focus || 'Add your investment focus'}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  {profile?.roleSpecificData?.fund_name || 'Add fund name'}
                </p>
                <p className="text-gray-600 text-sm">
                  {profile?.location || 'Add location'}
                </p>
                {profile?.roleSpecificData?.min_investment && profile?.roleSpecificData?.max_investment && (
                  <p className="text-green-600 font-semibold mt-2">
                    Investment Range: Rs. {profile.roleSpecificData.min_investment.toLocaleString()} - Rs. {profile.roleSpecificData.max_investment.toLocaleString()}
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
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
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
            <div className="text-2xl font-bold text-gray-900">{stats.connections}</div>
            <div className="text-sm text-gray-700">Connections</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-yellow-600 text-2xl mb-2">📋</div>
            <div className="text-2xl font-bold text-gray-900">{stats.investmentRequests}</div>
            <div className="text-sm text-gray-700">Pending Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-green-600 text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeInvestments}</div>
            <div className="text-sm text-gray-700">Active Investments</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-purple-600 text-2xl mb-2">💵</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {stats.totalInvested.toLocaleString()}
            </div>
            <div className="text-sm text-gray-700">Total Invested</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInvestmentRequests = () => (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Pending Requests</h3>
        {investmentRequests.filter(req => req.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {investmentRequests.filter(req => req.status === 'pending').map((request) => (
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
                    {request.pitch_deck_url && (
                      <a
                        href={request.pitch_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      >
                        📄 View Pitch Deck
                      </a>
                    )}
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

      {/* Active Investments */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Active Investments</h3>
        {activeInvestments.length > 0 ? (
          <div className="space-y-4">
            {activeInvestments.map((investment) => (
              <div key={investment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {investment.startup?.profiles?.full_name}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Company: {investment.startup?.company_name}
                    </p>
                    <p className="text-gray-700 mt-2">{investment.message}</p>
                    {investment.pitch_deck_url && (
                      <a
                        href={investment.pitch_deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      >
                        📄 View Pitch Deck
                      </a>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Invested on {new Date(investment.updated_at).toLocaleDateString()}
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
          <p className="text-gray-600">No active investments</p>
        )}
      </div>
    </div>
  )

  const renderPortfolio = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Management</h3>
      <div className="text-center py-8">
        <p className="text-gray-600">Portfolio management features coming soon</p>
        <p className="text-sm text-gray-500 mt-1">
          Track your investments and portfolio performance
        </p>
      </div>
    </div>
  )

  const renderConnections = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Connections</h3>
      {connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">My Events</h3>
      {eventsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : registeredEvents.length > 0 ? (
        <div className="space-y-4">
          {registeredEvents.map((registration) => {
            const event = registration.events
            const eventDate = new Date(event.date)
            const now = new Date()
            const isUpcoming = eventDate > now
            const isPast = eventDate < now
            const isToday = eventDate.toDateString() === now.toDateString()
            
            let statusColor = 'bg-gray-100 text-gray-600'
            let statusText = 'Past'
            
            if (isUpcoming) {
              statusColor = 'bg-blue-100 text-blue-600'
              statusText = 'Upcoming'
            } else if (isToday) {
              statusColor = 'bg-green-100 text-green-600'
              statusText = 'Today'
            }
            
            return (
              <div key={registration.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>📅 {eventDate.toLocaleDateString()}</span>
                      <span>🕒 {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {event.location && <span>📍 {event.location}</span>}
                    </div>
                    {event.meeting_link && (isUpcoming || isToday) && (
                      <a
                        href={event.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                    {isUpcoming && (
                      <button
                        onClick={async () => {
                          try {
                            const result = await cancelEventRegistration(registration.id)
                            if (result.error) {
                              toast.error('Failed to cancel registration')
                            } else {
                              toast.success('Registration cancelled successfully')
                              fetchRegisteredEvents()
                            }
                          } catch (error) {
                            console.error('Error cancelling registration:', error)
                            toast.error('Failed to cancel registration')
                          }
                        }}
                        className="px-3 py-1 text-red-600 border border-red-600 rounded text-sm hover:bg-red-50"
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
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No events registered yet</p>
          <Link
            to="/explore"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Browse Events
          </Link>
        </div>
      )}
    </div>
  )

  const renderRecommendations = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
      {recsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <RecommendationCardSkeleton key={i} />
          ))}
        </div>
      ) : recs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.map((r) => (
            <Link key={r.id} href={`/profile/${r.full_name ? generateSlug(r.full_name) : r.id}`}>
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12">
                    <Image
                      src={r.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="24" fill="%23e5e7eb"/></svg>'}
                      alt={r.full_name || 'User'}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 hover:text-blue-600">{r.full_name || 'User'}</h4>
                    <p className="text-sm text-gray-700 capitalize">{r.role}</p>
                    {r.reasons?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{r.reasons[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
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
            { id: 'requests', name: 'Investment Requests' },
            { id: 'portfolio', name: 'Portfolio' },
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
      {activeTab === 'requests' && renderInvestmentRequests()}
      {activeTab === 'portfolio' && renderPortfolio()}
      {activeTab === 'connections' && renderConnections()}
      {activeTab === 'events' && renderEvents()}
      {activeTab === 'recommendations' && renderRecommendations()}

      {/* Response Modal */}
      {respondingTo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {respondingTo.action === 'accepted' ? 'Accept' : 'Reject'} Investment Request
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