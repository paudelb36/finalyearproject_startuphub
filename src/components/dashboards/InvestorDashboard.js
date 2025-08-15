'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { fetchEssentialData, fetchSecondaryData, fetchTertiaryData } from '@/lib/services/dashboardDataService'

export default function InvestorDashboard({ profile }) {
  const { user } = useAuth()
  // Progressive loading states
  const [essentialData, setEssentialData] = useState(null)
  const [secondaryData, setSecondaryData] = useState(null)
  const [tertiaryData, setTertiaryData] = useState(null)
  const [essentialLoading, setEssentialLoading] = useState(true)
  const [secondaryLoading, setSecondaryLoading] = useState(true)
  const [tertiaryLoading, setTertiaryLoading] = useState(true)
  
  // Legacy states for events
  // Registered events are now handled by tertiaryData
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
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

  // Stats, investment requests, and connections are now handled by the data service

  // Recent activity is now handled by the data service

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
            {tertiaryLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading recent activity...</p>
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
            <div className="text-2xl font-bold text-gray-900">
              {essentialLoading ? '...' : essentialData?.stats?.connections || 0}
            </div>
            <div className="text-sm text-gray-700">Connections</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-yellow-600 text-2xl mb-2">📋</div>
            <div className="text-2xl font-bold text-gray-900">
              {essentialLoading ? '...' : essentialData?.stats?.investmentRequests || 0}
            </div>
            <div className="text-sm text-gray-700">Pending Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-green-600 text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">
              {essentialLoading ? '...' : essentialData?.stats?.activeInvestments || 0}
            </div>
            <div className="text-sm text-gray-700">Active Investments</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-purple-600 text-2xl mb-2">💵</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {essentialLoading ? '...' : (essentialData?.stats?.totalInvested || 0).toLocaleString()}
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
        {secondaryLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading investment requests...</p>
          </div>
        ) : secondaryData?.requests?.investment?.filter(req => req.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.investment.filter(req => req.status === 'pending').map((request) => (
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
        {secondaryLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading active investments...</p>
          </div>
        ) : secondaryData?.requests?.investment?.filter(req => req.status === 'accepted').length > 0 ? (
          <div className="space-y-4">
            {secondaryData.requests.investment.filter(req => req.status === 'accepted').map((investment) => (
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
      {secondaryLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading connections...</p>
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">My Events</h3>
      {tertiaryLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : tertiaryData?.events?.length > 0 ? (
        <div className="space-y-4">
          {tertiaryData.events.map((registration) => {
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
                              // Refresh tertiary data to update events
                              const newTertiaryData = await fetchTertiaryData(user, profile)
                              setTertiaryData(newTertiaryData)
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
            href="/explore"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Browse Events
          </Link>
        </div>
      )}
    </div>
  )

  const handleContactRecommendation = (recommendation, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const subject = `Investment Inquiry from ${profile?.full_name}`
    const body = `Hi ${recommendation.title},\n\nI'm ${profile?.full_name}, an investor on our startup platform. I came across your ${recommendation.type === 'startup' ? 'startup' : 'profile'} and would love to connect.\n\n${recommendation.type === 'startup' ? `I'm interested in potentially investing in ${recommendation.title}. Based on your ${recommendation.stage || 'current'} stage and funding goal, this could be a great fit for my investment portfolio.` : 'I\'d like to explore potential investment opportunities.'}\n\nBest regards,\n${profile?.full_name}\n${profile?.roleSpecificData?.fund_name || ''}`
    
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
          {tertiaryData.recommendations.map((r) => {
            return (
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
                      {r.fundingGoal && (
                        <p className="text-xs text-green-600 mt-1">Goal: ${r.fundingGoal.toLocaleString()}</p>
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
            )
          })}
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