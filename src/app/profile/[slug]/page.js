'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, generateSlug } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Users, Building, Award, Target, DollarSign, TrendingUp, Mail, Phone, Globe, Linkedin, Twitter } from 'lucide-react'

export default function UserProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState(null)
  const [roleSpecificData, setRoleSpecificData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.slug) {
      fetchUserProfile()
    }
  }, [params.slug])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // First, try to find user by slug (generated from full_name)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
      
      if (profilesError) throw profilesError
      
      // Find profile where generated slug matches the URL slug
      const matchingProfile = profiles.find(profile => {
        if (!profile.full_name) return false
        const generatedSlug = generateSlug(profile.full_name)
        return generatedSlug === params.slug
      })
      
      if (!matchingProfile) {
        throw new Error('User not found')
      }
      
      setProfile(matchingProfile)

      // Fetch role-specific data
      let roleData = null
      if (matchingProfile.role === 'startup') {
        const { data, error } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', matchingProfile.id)
          .single()
        if (!error) roleData = data
      } else if (matchingProfile.role === 'mentor') {
        const { data, error } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('user_id', matchingProfile.id)
          .single()
        if (!error) roleData = data
      } else if (matchingProfile.role === 'investor') {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', matchingProfile.id)
          .single()
        if (!error) roleData = data
      }
      
      setRoleSpecificData(roleData)
    } catch (error) {
      console.error('Error fetching user profile:', error?.message || error)
      toast.error('User not found or failed to load profile')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-8">The user profile you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const renderStartupProfile = () => (
    <div className="space-y-8">
      {roleSpecificData && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Building className="w-6 h-6 mr-3 text-blue-600" />
              Company Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Company Name</h3>
                <p className="text-gray-900">{roleSpecificData.company_name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Industry</h3>
                <p className="text-gray-900">{roleSpecificData.industry}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Tagline</h3>
                <p className="text-gray-900">{roleSpecificData.tagline}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900">{roleSpecificData.description}</p>
              </div>
              {roleSpecificData.website && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Website</h3>
                  <a
                    href={roleSpecificData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {roleSpecificData.website}
                  </a>
                </div>
              )}
              {roleSpecificData.funding_stage && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Funding Stage</h3>
                  <p className="text-gray-900">{roleSpecificData.funding_stage}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderMentorProfile = () => (
    <div className="space-y-8">
      {roleSpecificData && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3 text-blue-600" />
              Professional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Current Position</h3>
                <p className="text-gray-900">{roleSpecificData.current_position}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Company</h3>
                <p className="text-gray-900">{roleSpecificData.company}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Years of Experience</h3>
                <p className="text-gray-900">{roleSpecificData.years_of_experience} years</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Industry</h3>
                <p className="text-gray-900">{roleSpecificData.industry}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Expertise Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {roleSpecificData.expertise_areas?.map((area, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Bio</h3>
                <p className="text-gray-900">{roleSpecificData.bio}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderInvestorProfile = () => (
    <div className="space-y-8">
      {roleSpecificData && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <DollarSign className="w-6 h-6 mr-3 text-blue-600" />
              Investment Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Investment Focus</h3>
                <p className="text-gray-900">{roleSpecificData.investment_focus}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Investment Range</h3>
                <p className="text-gray-900">{roleSpecificData.investment_range}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Preferred Industries</h3>
                <div className="flex flex-wrap gap-2">
                  {roleSpecificData.preferred_industries?.map((industry, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-2">Bio</h3>
                <p className="text-gray-900">{roleSpecificData.bio}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  width={120}
                  height={120}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-30 h-30 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${
                profile.role === 'startup' ? 'bg-blue-500' :
                profile.role === 'mentor' ? 'bg-green-500' :
                profile.role === 'investor' ? 'bg-purple-500' : 'bg-gray-500'
              }`}></div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>
              <div className="flex items-center space-x-4 text-gray-600 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profile.role === 'startup' ? 'bg-blue-100 text-blue-800' :
                  profile.role === 'mentor' ? 'bg-green-100 text-green-800' :
                  profile.role === 'investor' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)}
                </span>
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="flex flex-wrap gap-4">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact
                  </a>
                )}
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific content */}
        {profile.role === 'startup' && renderStartupProfile()}
        {profile.role === 'mentor' && renderMentorProfile()}
        {profile.role === 'investor' && renderInvestorProfile()}
      </div>
    </div>
  )
}