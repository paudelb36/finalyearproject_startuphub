'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import StartupProfileManager from '@/components/StartupProfileManager'
import MentorProfileManager from '@/components/MentorProfileManager'
import InvestorProfileManager from '@/components/InvestorProfileManager'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
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
        <p className="text-gray-600 mb-8">You need to be signed in to access your profile.</p>
        <Link href="/auth/signin" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white  p-4">
        <div className="flex items-center justify-between">
           <Link
             href="/dashboard"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Profile Management Content */}
      {profile?.role === 'startup' ? (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Startup Profile Management</h2>
            <p className="text-gray-600 mt-1">Manage your startup information, team, and pitch materials</p>
          </div>
           <StartupProfileManager />
        </div>
      ) : profile?.role === 'mentor' ? (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Mentor Profile Management</h2>
            <p className="text-gray-600 mt-1">Manage your mentorship information, expertise, and availability</p>
          </div>
           <MentorProfileManager />
        </div>
      ) : profile?.role === 'investor' ? (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Investor Profile Management</h2>
            <p className="text-gray-600 mt-1">Manage your investment preferences, fund information, and portfolio</p>
          </div>
           <InvestorProfileManager />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Management</h2>
          <p className="text-gray-600">
            Profile management for {profile?.role} users is coming soon.
          </p>
          <div className="mt-6">
            <Link
              href="/profiles/edit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Basic Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}