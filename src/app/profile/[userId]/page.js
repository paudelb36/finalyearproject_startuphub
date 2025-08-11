'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { sendConnectionRequest } from '@/lib/api/connections'

export default function UserProfilePage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [roleSpecificData, setRoleSpecificData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    if (params.userId) {
      fetchUserProfile()
    }
  }, [params.userId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Fetch basic profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch role-specific data
      let roleData = null
      if (profileData.role === 'startup') {
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'mentor') {
        const { data, error } = await supabase
          .from('mentors')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'investor') {
        const { data, error } = await supabase
          .from('investors')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      }
      
      setRoleSpecificData(roleData)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSendConnectionRequest = async (type = 'general') => {
    if (!user) {
      toast.error('Please sign in to send connection requests')
      return
    }

    if (user.id === params.userId) {
      toast.error('You cannot send a connection request to yourself')
      return
    }

    try {
      setSendingRequest(true)
      await sendConnectionRequest(user.id, params.userId, type)
      toast.success(`${type === 'general' ? 'Connection' : type.charAt(0).toUpperCase() + type.slice(1)} request sent successfully!`)
    } catch (error) {
      console.error('Error sending connection request:', error)
      toast.error(error.message || 'Failed to send connection request')
    } finally {
      setSendingRequest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
        <p className="text-gray-600 mb-8">The user profile you're looking for doesn't exist.</p>
        <Link href="/explore" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Back to Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mb-4"
        >
          ← Back
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <span className="text-3xl font-semibold text-gray-600">
                {profile.full_name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>
            <p className="text-lg text-gray-600 capitalize mb-2">{profile.role}</p>
            <p className="text-gray-600 mb-4">{profile.bio || 'No bio provided.'}</p>
            <p className="text-sm text-gray-500">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>

          {/* Action Buttons */}
          {user && user.id !== params.userId && (
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => handleSendConnectionRequest('general')}
                disabled={sendingRequest}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sendingRequest ? 'Sending...' : 'Connect'}
              </button>
              
              {profile.role === 'mentor' && (
                <button
                  onClick={() => handleSendConnectionRequest('mentorship')}
                  disabled={sendingRequest}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {sendingRequest ? 'Sending...' : 'Request Mentorship'}
                </button>
              )}
              
              {profile.role === 'investor' && (
                <button
                  onClick={() => handleSendConnectionRequest('investment')}
                  disabled={sendingRequest}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {sendingRequest ? 'Sending...' : 'Request Investment'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role-Specific Information */}
      {roleSpecificData && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {profile.role === 'startup' ? 'Startup Details' : 
             profile.role === 'mentor' ? 'Mentor Details' : 'Investor Details'}
          </h2>

          {profile.role === 'startup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Company Name</h3>
                  <p className="text-gray-600">{roleSpecificData.company_name || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Industry</h3>
                  <p className="text-gray-600">{roleSpecificData.industry || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Stage</h3>
                  <p className="text-gray-600">{roleSpecificData.stage || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <p className="text-gray-600">{roleSpecificData.location || 'Not provided'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tagline</h3>
                <p className="text-gray-600">{roleSpecificData.tagline || 'Not provided'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{roleSpecificData.description || 'Not provided'}</p>
              </div>
              
              {roleSpecificData.website_url && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Website</h3>
                  <a 
                    href={roleSpecificData.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {roleSpecificData.website_url}
                  </a>
                </div>
              )}
            </div>
          )}

          {profile.role === 'mentor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Expertise</h3>
                  <p className="text-gray-600">{roleSpecificData.expertise || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                  <p className="text-gray-600">{roleSpecificData.experience_years ? `${roleSpecificData.experience_years} years` : 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Industry</h3>
                  <p className="text-gray-600">{roleSpecificData.industry || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <p className="text-gray-600">{roleSpecificData.location || 'Not provided'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">{roleSpecificData.bio || 'Not provided'}</p>
              </div>
            </div>
          )}

          {profile.role === 'investor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Investment Focus</h3>
                  <p className="text-gray-600">{roleSpecificData.investment_focus || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Investment Range</h3>
                  <p className="text-gray-600">
                    {roleSpecificData.min_investment && roleSpecificData.max_investment 
                      ? `Rs. ${roleSpecificData.min_investment.toLocaleString()} - Rs. ${roleSpecificData.max_investment.toLocaleString()}`
                      : 'Not provided'
                    }
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Industries</h3>
                  <p className="text-gray-600">{roleSpecificData.industries || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <p className="text-gray-600">{roleSpecificData.location || 'Not provided'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">{roleSpecificData.bio || 'Not provided'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}