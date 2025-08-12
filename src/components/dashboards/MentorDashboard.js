'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { getMentorshipRequests, respondToMentorshipRequest } from '@/lib/api/requests'
import { getUserConnections, getConnectionStats } from '@/lib/api/connections'

export default function MentorDashboard({ profile }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    connections: 0,
    mentorshipRequests: 0,
    activeMentorships: 0,
    totalEarnings: 0
  })
  const [mentorshipRequests, setMentorshipRequests] = useState([])
  const [activeMentorships, setActiveMentorships] = useState([])
  const [connections, setConnections] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [respondingTo, setRespondingTo] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')

  useEffect(() => {
    if (user && profile) {
      fetchDashboardData()
    }
  }, [user, profile])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchStats(),
        fetchMentorshipRequests(),
        fetchConnections(),
        fetchRecentActivity()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const connectionStats = await getConnectionStats(user.id)
      
      // Get mentorship request stats
      const { data: mentorshipStats } = await supabase
        .from('mentorship_requests')
        .select('status')
        .eq('mentor_id', profile.roleSpecificData?.id)

      const pendingRequests = mentorshipStats?.filter(req => req.status === 'pending').length || 0
      const activeMentorships = mentorshipStats?.filter(req => req.status === 'accepted').length || 0

      setStats({
        connections: connectionStats.total_connections || 0,
        mentorshipRequests: pendingRequests,
        activeMentorships,
        totalEarnings: 0 // This would come from a transactions table
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchMentorshipRequests = async () => {
    try {
      const response = await getMentorshipRequests(user.id, 'received')
      const requests = response?.data || []
      setMentorshipRequests(requests)
      
      const accepted = requests.filter(req => req.status === 'accepted') || []
      setActiveMentorships(accepted)
    } catch (error) {
      console.error('Error fetching mentorship requests:', error?.message || error)
      setMentorshipRequests([])
      setActiveMentorships([])
    }
  }

  const fetchConnections = async () => {
    try {
      const connectionsData = await getUserConnections(user.id)
      setConnections(connectionsData || [])
    } catch (error) {
      console.error('Error fetching connections:', error)
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
          requester:profiles!inner(full_name),
          target:profiles!inner(full_name)
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

      // Recent mentorship requests
      const { data: recentRequests } = await supabase
        .from('mentorship_requests')
        .select(`
          *,
          startup:profiles!inner(
            id,
            full_name
          ),
          startup_profile:startup_profiles!inner(
            user_id,
            company_name
          )
        `)
        .eq('mentor_id', profile.roleSpecificData?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      recentRequests?.forEach((req) => {
        activities.push({
          id: `mentor-${req.id}`,
          type: 'mentorship',
          title: `Mentorship request from ${req.startup.profiles.full_name}`,
          time: req.created_at,
          status: req.status
        })
      })

      // Sort by time and take latest 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time))
      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

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
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-gray-600">
                    {profile?.full_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || 'Your Name'}
                </h2>
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
                  {profile?.roleSpecificData?.location || 'Add location'}
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
              <Link
                href="/profile/edit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </Link>
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
            <div className="text-2xl font-bold text-gray-900">{stats.mentorshipRequests}</div>
            <div className="text-sm text-gray-700">Pending Requests</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-green-600 text-2xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeMentorships}</div>
            <div className="text-sm text-gray-700">Active Mentorships</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <div className="text-purple-600 text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {stats.totalEarnings.toLocaleString()}
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
        {mentorshipRequests.filter(req => req.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {mentorshipRequests.filter(req => req.status === 'pending').map((request) => (
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
        {activeMentorships.length > 0 ? (
          <div className="space-y-4">
            {activeMentorships.map((mentorship) => (
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
            { id: 'connections', name: 'Connections' }
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