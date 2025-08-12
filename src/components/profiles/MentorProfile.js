'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sendConnectionRequest } from '@/lib/api/connections'
import { sendMentorshipRequest, cancelRequest } from '@/lib/api/requests'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

export default function MentorProfile({ profile, mentorProfile, isOwnProfile = false }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [mentorshipRequests, setMentorshipRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showMentorshipModal, setShowMentorshipModal] = useState(false)
  const [mentorshipMessage, setMentorshipMessage] = useState('')

  useEffect(() => {
    if (user && !isOwnProfile) {
      fetchConnectionStatus()
      fetchRequestStatuses()
    }
  }, [user, profile?.id, isOwnProfile])

  const fetchConnectionStatus = async () => {
    try {
      const { data } = await supabase
        .from('connections')
        .select('status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .single()

      setConnectionStatus(data?.status || null)
    } catch (error) {
      console.error('Error fetching connection status:', error)
    }
  }

  const fetchRequestStatuses = async () => {
    try {
      // Check mentorship requests (only if current user is a startup)
      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userProfile?.role === 'startup') {
          const { data: mentorshipData } = await supabase
            .from('mentorship_requests')
            .select('id, status')
            .eq('startup_id', user.id)
            .eq('mentor_id', profile.id)

          setMentorshipRequests(mentorshipData || [])
        }
      }
    } catch (error) {
      console.error('Error fetching request statuses:', error)
    }
  }

  const handleConnectionRequest = async () => {
    if (!user) {
      toast.error('Please log in to send connection requests')
      return
    }

    setLoading(true)
    try {
      if (connectionStatus === 'pending') {
        // Cancel connection request
        const { data: connection } = await supabase
          .from('connections')
          .select('id')
          .eq('sender_id', user.id)
          .eq('receiver_id', profile.id)
          .eq('status', 'pending')
          .single()

        if (connection) {
          await supabase
            .from('connections')
            .update({ status: 'cancelled' })
            .eq('id', connection.id)

          setConnectionStatus(null)
          toast.success('Connection request cancelled')
        }
      } else {
        // Send connection request
        const result = await sendConnectionRequest(profile.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          setConnectionStatus('pending')
          toast.success('Connection request sent!')
        }
      }
    } catch (error) {
      console.error('Error handling connection request:', error)
      toast.error('Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  const handleMentorshipRequest = async () => {
    if (!mentorshipMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    setLoading(true)
    try {
      const result = await sendMentorshipRequest(profile.id, mentorshipMessage)
      if (result.error) {
        toast.error(result.error)
      } else {
        setMentorshipRequests([...mentorshipRequests, { id: result.data.id, status: 'pending' }])
        setShowMentorshipModal(false)
        setMentorshipMessage('')
        toast.success('Mentorship request sent!')
      }
    } catch (error) {
      console.error('Error sending mentorship request:', error)
      toast.error('Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = async (requestId) => {
    setLoading(true)
    try {
      const result = await cancelRequest(requestId, 'mentorship')
      if (result.error) {
        toast.error(result.error)
      } else {
        setMentorshipRequests(mentorshipRequests.filter(r => r.id !== requestId))
        toast.success('Request cancelled')
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error('Failed to cancel request')
    } finally {
      setLoading(false)
    }
  }

  const getConnectionButtonText = () => {
    if (connectionStatus === 'pending') return 'Cancel Connection'
    if (connectionStatus === 'accepted') return 'Connected'
    return 'Connect'
  }

  const getConnectionButtonClass = () => {
    if (connectionStatus === 'accepted') {
      return 'bg-green-100 text-green-700 cursor-default'
    }
    if (connectionStatus === 'pending') {
      return 'bg-red-100 text-red-700 hover:bg-red-200'
    }
    return 'bg-blue-600 text-white hover:bg-blue-700'
  }

  const pendingMentorshipRequest = mentorshipRequests.find(r => r.status === 'pending')
  const canRequestMentorship = user && profile?.role === 'mentor' && !isOwnProfile

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-8">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={profile?.avatar_url || '/default-avatar.png'}
              alt={profile?.full_name}
              width={80}
              height={80}
              className="rounded-full border-4 border-white"
            />
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
            <p className="text-green-100">Mentor</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {mentorProfile?.years_experience || 0}+ years experience
              </span>
              {mentorProfile?.hourly_rate && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  ${mentorProfile.hourly_rate}/hour
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Banner */}
      {mentorProfile?.hourly_rate && (
        <div className="bg-green-50 border-l-4 border-green-400 px-6 py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <span className="font-medium">Mentorship Rate:</span> ${mentorProfile.hourly_rate}/hour
                {mentorProfile.session_rate && (
                  <span> • ${mentorProfile.session_rate}/session</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isOwnProfile && user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={handleConnectionRequest}
              disabled={loading || connectionStatus === 'accepted'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                getConnectionButtonClass()
              } disabled:opacity-50`}
            >
              {getConnectionButtonText()}
            </button>

            {canRequestMentorship && (
              <button
                onClick={() => setShowMentorshipModal(true)}
                disabled={loading || pendingMentorshipRequest}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingMentorshipRequest ? 'Request Sent' : 'Request Mentorship'}
              </button>
            )}

            {pendingMentorshipRequest && (
              <button
                onClick={() => handleCancelRequest(pendingMentorshipRequest.id)}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profile Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed">
                {profile?.bio || 'No bio available.'}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Areas of Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {mentorProfile?.expertise_tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                )) || (
                  <p className="text-gray-500">No expertise areas specified.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium">Email:</span> {profile?.email}
                </p>
                {profile?.phone && (
                  <p className="text-gray-700">
                    <span className="font-medium">Phone:</span> {profile.phone}
                  </p>
                )}
                {profile?.linkedin_url && (
                  <p className="text-gray-700">
                    <span className="font-medium">LinkedIn:</span>{' '}
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Profile
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience & Background</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Years of Experience:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.years_experience || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Role:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.current_role || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.current_company || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Industry Focus:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.industry_focus || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Mentorship Details</h3>
              <div className="space-y-3">
                {mentorProfile?.hourly_rate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hourly Rate:</span>
                    <span className="text-gray-900 font-medium">
                      ${mentorProfile.hourly_rate}/hour
                    </span>
                  </div>
                )}
                {mentorProfile?.session_rate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session Rate:</span>
                    <span className="text-gray-900 font-medium">
                      ${mentorProfile.session_rate}/session
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Availability:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.availability || 'Contact for availability'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Time:</span>
                  <span className="text-gray-900 font-medium">
                    {mentorProfile?.response_time || 'Within 24 hours'}
                  </span>
                </div>
              </div>
            </div>

            {mentorProfile?.mentorship_approach && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mentorship Approach</h3>
                <p className="text-gray-700 leading-relaxed">
                  {mentorProfile.mentorship_approach}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mentorship Request Modal */}
      {showMentorshipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Mentorship</h3>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <span className="font-medium">Rate:</span> ${mentorProfile?.hourly_rate || 'Contact for pricing'}/hour
                {mentorProfile?.session_rate && (
                  <span> • ${mentorProfile.session_rate}/session</span>
                )}
              </p>
            </div>
            <textarea
              value={mentorshipMessage}
              onChange={(e) => setMentorshipMessage(e.target.value)}
              placeholder="Explain why you're seeking mentorship, your goals, and what specific areas you'd like help with..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleMentorshipRequest}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Send Request
              </button>
              <button
                onClick={() => setShowMentorshipModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400"
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