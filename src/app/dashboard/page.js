'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import StartupDashboard from '@/components/dashboards/StartupDashboard'
import MentorDashboard from '@/components/dashboards/MentorDashboard'
import InvestorDashboard from '@/components/dashboards/InvestorDashboard'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user, authProfile])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Prefer profile from auth context to avoid redundant fetch
      let profileData = authProfile
      if (!profileData) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          toast.error('Failed to load profile')
          return
        }
        profileData = data
      }

      // Get role-specific data
      let roleSpecificData = null
      if (profileData.role) {
        roleSpecificData = await fetchRoleSpecificData(profileData.role, user.id)
      }

      setProfile({
        ...profileData,
        roleSpecificData
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleSpecificData = async (role, userId) => {
    try {
      switch (role) {
        case 'startup':
          const { data: startupData, error: startupError } = await supabase
            .from('startup_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          if (startupError && startupError.code !== 'PGRST116') {
            console.error('Error fetching startup profile:', startupError)
          }
          return startupData

        case 'mentor':
          const { data: mentorData, error: mentorError } = await supabase
            .from('mentor_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          if (mentorError && mentorError.code !== 'PGRST116') {
            console.error('Error fetching mentor profile:', mentorError)
          }
          return mentorData

        case 'investor':
          const { data: investorData, error: investorError } = await supabase
            .from('investor_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          if (investorError && investorError.code !== 'PGRST116') {
            console.error('Error fetching investor profile:', investorError)
          }
          return investorData

        default:
          return null
      }
    } catch (error) {
      console.error('Error fetching role-specific data:', error)
      return null
    }
  }

  const renderDashboard = () => {
    if (!profile) {
      return (
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
            <p className="text-gray-700 mb-6">
              We couldn't find your profile. Please complete your profile setup.
            </p>
            <Link
              href="/profile/setup"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Complete Profile Setup
            </Link>
          </div>
        </div>
      )
    }

    switch (profile.role) {
      case 'startup':
        return <StartupDashboard profile={profile} />
      case 'mentor':
        return <MentorDashboard profile={profile} />
      case 'investor':
        return <InvestorDashboard profile={profile} />
      default:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Not Set</h2>
              <p className="text-gray-700 mb-6">
                Please select your role to access your dashboard.
              </p>
              <Link
                href="/profile/setup"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Set Your Role
              </Link>
            </div>
          </div>
        )
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-6">
            Please log in to access your dashboard.
          </p>
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    )
  }

  return renderDashboard()
}
