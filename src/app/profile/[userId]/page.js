'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import StartupProfile from '@/components/profiles/StartupProfile'
import MentorProfile from '@/components/profiles/MentorProfile'
import InvestorProfile from '@/components/profiles/InvestorProfile'

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
          .from('startup_profiles')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'mentor') {
        const { data, error } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'investor') {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', params.userId)
          .single()
        if (!error) roleData = data
      }
      
      setRoleSpecificData(roleData)
    } catch (error) {
      console.error('Error fetching user profile:', error?.message || error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
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
        <p className="text-gray-600 mb-8">The user profile you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/explore" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Back to Explore
        </Link>
      </div>
    )
  }

  const isOwnProfile = user?.id === params.userId

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors mb-4"
        >
          ← Back
        </button>
      </div>

      {/* Role-Specific Profile Component */}
      {profile.role === 'startup' && (
        <StartupProfile 
          profile={profile} 
          startupProfile={roleSpecificData} 
          isOwnProfile={isOwnProfile}
        />
      )}
      
      {profile.role === 'mentor' && (
        <MentorProfile 
          profile={profile} 
          mentorProfile={roleSpecificData} 
          isOwnProfile={isOwnProfile}
        />
      )}
      
      {profile.role === 'investor' && (
        <InvestorProfile 
          profile={profile} 
          investorProfile={roleSpecificData} 
          isOwnProfile={isOwnProfile}
        />
      )}
    </div>
  )
}