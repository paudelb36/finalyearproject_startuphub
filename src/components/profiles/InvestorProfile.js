'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sendConnectionRequest } from '@/lib/api/connections'
import { sendInvestmentRequest, cancelRequest } from '@/lib/api/requests'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

export default function InvestorProfile({ profile, investorProfile, isOwnProfile = false }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [investmentRequests, setInvestmentRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
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
      // Check investment requests (only if current user is a startup)
      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userProfile?.role === 'startup') {
          const { data: investmentData } = await supabase
            .from('investment_requests')
            .select('id, status')
            .eq('startup_id', user.id)
            .eq('investor_id', profile.id)

          setInvestmentRequests(investmentData || [])
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

  const handleCancelRequest = async (requestId) => {
    setLoading(true)
    try {
      const result = await cancelRequest(requestId, 'investment')
      if (result.error) {
        toast.error(result.error)
      } else {
        setInvestmentRequests(investmentRequests.filter(r => r.id !== requestId))
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

  const pendingInvestmentRequest = investmentRequests.find(r => r.status === 'pending')
  const canRequestInvestment = user && profile?.role === 'investor' && !isOwnProfile

  const formatTicketSize = () => {
    if (investorProfile?.ticket_size_min && investorProfile?.ticket_size_max) {
      return `$${investorProfile.ticket_size_min.toLocaleString()} - $${investorProfile.ticket_size_max.toLocaleString()}`
    } else if (investorProfile?.ticket_size_min) {
      return `$${investorProfile.ticket_size_min.toLocaleString()}+`
    } else if (investorProfile?.ticket_size_max) {
      return `Up to $${investorProfile.ticket_size_max.toLocaleString()}`
    }
    return 'Contact for details'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-8">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={investorProfile?.logo_url || profile?.avatar_url || '/default-avatar.png'}
              alt={investorProfile?.fund_name || profile?.full_name}
              width={80}
              height={80}
              className="rounded-full border-4 border-white"
            />
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold">
              {investorProfile?.fund_name || profile?.full_name}
            </h1>
            <p className="text-purple-100">{profile?.full_name} • Investor</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {formatTicketSize()}
              </span>
              {investorProfile?.investment_stage && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {investorProfile.investment_stage}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Focus Banner */}
      {investorProfile?.investment_focus && (
        <div className="bg-purple-50 border-l-4 border-purple-400 px-6 py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Investment Focus:</span> {investorProfile.investment_focus}
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

            {canRequestInvestment && (
              <button
                onClick={() => setShowInvestmentModal(true)}
                disabled={loading || pendingInvestmentRequest}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingInvestmentRequest ? 'Request Sent' : 'Request Investment'}
              </button>
            )}

            {pendingInvestmentRequest && (
              <button
                onClick={() => handleCancelRequest(pendingInvestmentRequest.id)}
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
                {investorProfile?.bio || profile?.bio || 'No bio available.'}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Preferred Industries</h3>
              <div className="flex flex-wrap gap-2">
                {investorProfile?.preferred_industries?.map((industry, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {industry}
                  </span>
                )) || (
                  <p className="text-gray-500">No industry preferences specified.</p>
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
                {investorProfile?.website && (
                  <p className="text-gray-700">
                    <span className="font-medium">Website:</span>{' '}
                    <a
                      href={investorProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {investorProfile.website}
                    </a>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fund Name:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.fund_name || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Size:</span>
                  <span className="text-gray-900 font-medium">
                    {formatTicketSize()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Stage:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.investment_stage || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investment Focus:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.investment_focus || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Geographic Focus:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.geographic_focus || 'Global'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Portfolio & Experience</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Portfolio Companies:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.portfolio_companies || 'Not disclosed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Years Active:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.years_active || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Notable Exits:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.notable_exits || 'Not disclosed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fund Size:</span>
                  <span className="text-gray-900 font-medium">
                    {investorProfile?.fund_size ? `$${investorProfile.fund_size.toLocaleString()}M` : 'Not disclosed'}
                  </span>
                </div>
              </div>
            </div>

            {investorProfile?.investment_criteria && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Investment Criteria</h3>
                <p className="text-gray-700 leading-relaxed">
                  {investorProfile.investment_criteria}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Request Modal */}
      {showInvestmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Investment</h3>
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Ticket Size:</span> {formatTicketSize()}
              </p>
              <p className="text-sm text-purple-700">
                <span className="font-medium">Focus:</span> {investorProfile?.investment_focus || 'Various'}
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={investmentMessage}
                onChange={(e) => setInvestmentMessage(e.target.value)}
                placeholder="Describe your investment opportunity, traction, and why this investor is a good fit..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch Deck (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPitchDeckFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">PDF files only, max 10MB</p>
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