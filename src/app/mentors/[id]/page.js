'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function MentorProfilePage() {
  const params = useParams()
  const { user } = useAuth()
  const [mentor, setMentor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchMentorData()
      if (user) {
        checkConnectionStatus()
      }
    }
  }, [params.id, user])

  const fetchMentorData = async () => {
    try {
      const { data: mentorData, error } = await supabase
        .from('mentor_profiles')
        .select(`
          *,
          profiles!mentor_profiles_user_id_fkey(id, full_name, avatar_url, email, bio, location)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setMentor(mentorData)
    } catch (error) {
      console.error('Error fetching mentor data:', error)
      toast.error('Failed to load mentor profile')
    } finally {
      setLoading(false)
    }
  }

  const checkConnectionStatus = async () => {
    if (!mentor || !user) return

    const { data } = await supabase
      .from('connections')
      .select('status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${mentor.user_id}),and(requester_id.eq.${mentor.user_id},recipient_id.eq.${user.id})`)
      .single()

    if (data) {
      setConnectionStatus(data.status)
      setIsConnected(data.status === 'accepted')
    }
  }

  const handleConnect = async () => {
    if (!user || !mentor) {
      toast.error('Please sign in to connect')
      return
    }

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          recipient_id: mentor.user_id,
          connection_type: 'startup_mentor',
          message: `Hi! I'd like to connect for mentorship opportunities.`
        })

      if (error) throw error

      setConnectionStatus('pending')
      toast.success('Mentorship request sent!')
    } catch (error) {
      console.error('Error sending connection request:', error)
      toast.error('Failed to send mentorship request')
    }
  }

  const handleMessage = () => {
    if (!user) {
      toast.error('Please sign in to send messages')
      return
    }
    window.location.href = `/messages?user=${mentor.user_id}`
  }

  const handleBookSession = () => {
    if (!user) {
      toast.error('Please sign in to book a session')
      return
    }
    setShowBookingModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!mentor) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Mentor Not Found</h1>
        <p className="text-gray-600 mb-8">The mentor you're looking for doesn't exist.</p>
        <Link href="/mentors" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Browse Mentors
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {mentor.profiles?.avatar_url && (
              <Image
                src={mentor.profiles.avatar_url}
                alt={mentor.profiles.full_name}
                width={120}
                height={120}
                className="rounded-full shadow-md"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {mentor.profiles?.full_name}
              </h1>
              <p className="text-xl text-gray-600 mb-2">{mentor.job_title}</p>
              {mentor.company && (
                <p className="text-lg text-gray-500 mb-4">at {mentor.company}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  {mentor.availability}
                </span>
                {mentor.years_experience && (
                  <span>🎯 {mentor.years_experience} years experience</span>
                )}
                {mentor.profiles?.location && (
                  <span>📍 {mentor.profiles.location}</span>
                )}
              </div>
            </div>
          </div>
          
          {user && user.id !== mentor.user_id && (
            <div className="flex space-x-3">
              {!isConnected && connectionStatus !== 'pending' && (
                <button
                  onClick={handleConnect}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Request Mentorship
                </button>
              )}
              {connectionStatus === 'pending' && (
                <button disabled className="bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed">
                  Request Sent
                </button>
              )}
              {isConnected && (
                <button
                  onClick={handleMessage}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Message
                </button>
              )}
              {mentor.is_paid && mentor.availability === 'available' && (
                <button
                  onClick={handleBookSession}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Book Session
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">
              {mentor.profiles?.bio || 'No bio available.'}
            </p>
            
            {mentor.linkedin_url && (
              <div className="mt-4">
                <a
                  href={mentor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  💼 LinkedIn Profile →
                </a>
              </div>
            )}
          </div>

          {/* Expertise Section */}
          {mentor.expertise_tags && mentor.expertise_tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mentorship Approach */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mentorship Approach</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-blue-600 text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Goal-Oriented</h3>
                  <p className="text-gray-600 text-sm">
                    Focus on achieving specific business objectives and milestones.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-green-600 text-xl">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Strategic Guidance</h3>
                  <p className="text-gray-600 text-sm">
                    Provide insights on strategy, growth, and market positioning.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <span className="text-purple-600 text-xl">🤝</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Network Access</h3>
                  <p className="text-gray-600 text-sm">
                    Connect you with relevant industry contacts and opportunities.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <span className="text-yellow-600 text-xl">📈</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Growth Focus</h3>
                  <p className="text-gray-600 text-sm">
                    Help scale your business and overcome growth challenges.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Availability & Pricing */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability & Pricing</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  mentor.availability === 'available' 
                    ? 'bg-green-100 text-green-800'
                    : mentor.availability === 'busy'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {mentor.availability}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">
                  {mentor.is_paid ? 'Paid' : 'Free'}
                </span>
              </div>
              {mentor.is_paid && mentor.hourly_rate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rate</span>
                  <span className="font-medium">
                    ${mentor.hourly_rate}/{mentor.currency || 'USD'} per hour
                  </span>
                </div>
              )}
            </div>
            
            {mentor.availability === 'available' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {mentor.is_paid ? (
                  <button
                    onClick={handleBookSession}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Book Paid Session
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connectionStatus === 'pending' || isConnected}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {connectionStatus === 'pending' ? 'Request Sent' : isConnected ? 'Connected' : 'Request Free Mentorship'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Experience */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience</h3>
            <div className="space-y-3">
              {mentor.years_experience && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Years</span>
                  <span className="font-medium">{mentor.years_experience}+ years</span>
                </div>
              )}
              {mentor.company && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Company</span>
                  <span className="font-medium">{mentor.company}</span>
                </div>
              )}
              {mentor.job_title && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Role</span>
                  <span className="font-medium">{mentor.job_title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Name</span>
                <p className="font-medium">{mentor.profiles?.full_name}</p>
              </div>
              {mentor.profiles?.location && (
                <div>
                  <span className="text-gray-600">Location</span>
                  <p className="font-medium">{mentor.profiles.location}</p>
                </div>
              )}
              {mentor.linkedin_url && (
                <div>
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    💼 LinkedIn Profile →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Book a Session</h3>
            <p className="text-gray-600 mb-4">
              You're about to book a paid mentorship session with {mentor.profiles?.full_name}.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rate:</span>
                <span className="font-semibold">
                  ${mentor.hourly_rate}/{mentor.currency || 'USD'} per hour
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBookingModal(false)
                  toast.success('Booking feature coming soon!')
                }}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}