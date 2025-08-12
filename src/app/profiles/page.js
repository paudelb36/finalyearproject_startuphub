'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import StartupProfile from '@/components/profiles/StartupProfile'
import MentorProfile from '@/components/profiles/MentorProfile'
import InvestorProfile from '@/components/profiles/InvestorProfile'

export default function CurrentUserProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [roleSpecificData, setRoleSpecificData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      let roleData = null
      if (profileData.role === 'startup') {
        const { data, error } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'mentor') {
        const { data, error } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (!error) roleData = data
      } else if (profileData.role === 'investor') {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (!error) roleData = data
      }

      setRoleSpecificData(roleData)
    } catch (error) {
      console.error('Error fetching profile:', error?.message || error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-8">You need to be signed in to view your profile.</p>
        <Link href="/auth/signin" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-8">Unable to load your profile data.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Role-Specific Profile Component */}
      {profile.role === 'startup' && (
        <StartupProfile profile={profile} startupProfile={roleSpecificData} isOwnProfile={true} />
      )}
      {profile.role === 'mentor' && (
        <MentorProfile profile={profile} mentorProfile={roleSpecificData} isOwnProfile={true} />
      )}
      {profile.role === 'investor' && (
        <InvestorProfile profile={profile} investorProfile={roleSpecificData} isOwnProfile={true} />
      )}

      {/* Edit Button */}
      <div className="mt-6">
        <Link href="/profiles/edit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Edit Profile
        </Link>
      </div>
    </div>
  )
}


