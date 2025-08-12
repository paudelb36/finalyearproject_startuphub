'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sendConnectionRequest } from '@/lib/api/connections'
import { sendMentorshipRequest, sendInvestmentRequest, cancelRequest } from '@/lib/api/requests'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

export default function StartupProfile({ profile, startupProfile, isOwnProfile = false }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [mentorshipRequests, setMentorshipRequests] = useState([])
  const [investmentRequests, setInvestmentRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showMentorshipModal, setShowMentorshipModal] = useState(false)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [mentorshipMessage, setMentorshipMessage] = useState('')
  const [investmentMessage, setInvestmentMessage] = useState('')
  const [pitchDeckFile, setPitchDeckFile] = useState(null)

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
      // Check mentorship requests
      const { data: mentorshipData } = await supabase
        .from('mentorship_requests')
        .select('id, status')
        .eq('startup_id', user.id)
        .eq('mentor_id', profile.id)

      setMentorshipRequests(mentorshipData || [])

      // Check investment requests
      const { data: investmentData } = await supabase
        .from('investment_requests')
        .select('id, status')
        .eq('startup_id', user.id)
        .eq('investor_id', profile.id)

      setInvestmentRequests(investmentData || [])
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

  const handleInvestmentRequest = async () => {
    if (!investmentMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    setLoading(true)
    try {
      let pitchDeckUrl = null
      
      // Upload pitch deck if provided
      if (pitchDeckFile) {
        const fileExt = pitchDeckFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pitch-decks')
          .upload(fileName, pitchDeckFile)

        if (uploadError) {
          toast.error('Failed to upload pitch deck')
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('pitch-decks')
          .getPublicUrl(fileName)

        pitchDeckUrl = publicUrl
      }

      const result = await sendInvestmentRequest(profile.id, investmentMessage, pitchDeckUrl)
      if (result.error) {
        toast.error(result.error)
      } else {
        setInvestmentRequests([...investmentRequests, { id: result.data.id, status: 'pending' }])
        setShowInvestmentModal(false)
        setInvestmentMessage('')
        setPitchDeckFile(null)
        toast.success('Investment request sent!')
      }
    } catch (error) {
      console.error('Error sending investment request:', error)
      toast.error('Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = async (requestId, requestType) => {
    setLoading(true)
    try {
      const result = await cancelRequest(requestId, requestType)
      if (result.error) {
        toast.error(result.error)
      } else {
        if (requestType === 'mentorship') {
          setMentorshipRequests(mentorshipRequests.filter(r => r.id !== requestId))
        } else {
          setInvestmentRequests(investmentRequests.filter(r => r.id !== requestId))
        }
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
  const pendingInvestmentRequest = investmentRequests.find(r => r.status === 'pending')

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={startupProfile?.logo_url || profile?.avatar_url || '/default-avatar.png'}
              alt={startupProfile?.company_name || profile?.full_name}
              width={80}
              height={80}
              className="rounded-full border-4 border-white"
            />
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold">{startupProfile?.company_name}</h1>
            <p className="text-blue-100">{profile?.full_name} • Founder</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {startupProfile?.industry}
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {startupProfile?.stage}
              </span>
            </div>
          </div>
        </div>
      </div>

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

            {profile?.role === 'mentor' && (
              <button
                onClick={() => setShowMentorshipModal(true)}
                disabled={loading || pendingMentorshipRequest}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingMentorshipRequest ? 'Request Sent' : 'Request Mentorship'}
              </button>
            )}

            {profile?.role === 'investor' && (
              <button
                onClick={() => setShowInvestmentModal(true)}
                disabled={loading || pendingInvestmentRequest}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingInvestmentRequest ? 'Request Sent' : 'Request Investment'}
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
                {startupProfile?.company_description || profile?.bio || 'No description available.'}
              </p>
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
                {startupProfile?.website && (
                  <p className="text-gray-700">
                    <span className="font-medium">Website:</span>{' '}
                    <a
                      href={startupProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {startupProfile.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Company Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Industry:</span>
                  <span className="text-gray-900 font-medium">{startupProfile?.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="text-gray-900 font-medium">{startupProfile?.stage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="text-gray-900 font-medium">{startupProfile?.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Founded:</span>
                  <span className="text-gray-900 font-medium">
                    {startupProfile?.founded_year || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Team Size:</span>
                  <span className="text-gray-900 font-medium">
                    {startupProfile?.team_size || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Funding Stage:</span>
                  <span className="text-gray-900 font-medium">
                    {startupProfile?.funding_stage || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Funding Raised:</span>
                  <span className="text-gray-900 font-medium">
                    {startupProfile?.funding_raised ? `$${startupProfile.funding_raised.toLocaleString()}` : 'Not disclosed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seeking:</span>
                  <span className="text-gray-900 font-medium">
                    {startupProfile?.seeking_amount ? `$${startupProfile.seeking_amount.toLocaleString()}` : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mentorship Request Modal */}
      {showMentorshipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Mentorship</h3>
            <textarea
              value={mentorshipMessage}
              onChange={(e) => setMentorshipMessage(e.target.value)}
              placeholder="Explain why you're seeking mentorship and your goals..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Investment Request Modal */}
      {showInvestmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Investment</h3>
            <div className="space-y-4">
              <textarea
                value={investmentMessage}
                onChange={(e) => setInvestmentMessage(e.target.value)}
                placeholder="Describe your investment opportunity..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch Deck (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPitchDeckFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleInvestmentRequest}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                Send Request
              </button>
              <button
                onClick={() => setShowInvestmentModal(false)}
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