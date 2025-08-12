'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StartupProfileManager from '@/components/StartupProfileManager'
import { toast } from 'react-hot-toast'

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  // Mentor-specific state
  const [mentorProfile, setMentorProfile] = useState(null)
  const [mentorFormData, setMentorFormData] = useState({
    expertise_tags: [],
    years_experience: '',
    availability: 'available',
    is_paid: false,
    hourly_rate: '',
    currency: 'USD',
    linkedin_url: '',
    company: '',
    job_title: ''
  })
  const [newExpertiseTag, setNewExpertiseTag] = useState('')

  // Investor-specific state
  const [investorProfile, setInvestorProfile] = useState(null)
  const [investorFormData, setInvestorFormData] = useState({
    fund_name: '',
    fund_size: '',
    ticket_size_min: '',
    ticket_size_max: '',
    portfolio_companies: '',
    linkedin_url: '',
    website_url: '',
    investment_stage: [],
    sectors: [],
    geographic_focus: []
  })
  const [newInvestmentStage, setNewInvestmentStage] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newGeographicFocus, setNewGeographicFocus] = useState('')

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

      if (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
        return
      }

      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || '',
        location: data.location || ''
      })

      // If mentor, also load mentor profile
      if (data.role === 'mentor') {
        const { data: mentorData, error: mentorError } = await supabase
          .from('mentor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (mentorError && mentorError.code !== 'PGRST116') {
          console.error('Error fetching mentor profile:', mentorError)
          toast.error('Failed to load mentor profile')
        } else if (mentorData) {
          setMentorProfile(mentorData)
          setMentorFormData({
            expertise_tags: mentorData.expertise_tags || [],
            years_experience: mentorData.years_experience || '',
            availability: mentorData.availability || 'available',
            is_paid: mentorData.is_paid || false,
            hourly_rate: mentorData.hourly_rate || '',
            currency: mentorData.currency || 'USD',
            linkedin_url: mentorData.linkedin_url || '',
            company: mentorData.company || '',
            job_title: mentorData.job_title || ''
          })
        }
      }

      // If investor, also load investor profile
      if (data.role === 'investor') {
        const { data: investorData, error: investorError } = await supabase
          .from('investor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (investorError && investorError.code !== 'PGRST116') {
          console.error('Error fetching investor profile:', investorError)
          toast.error('Failed to load investor profile')
        } else if (investorData) {
          setInvestorProfile(investorData)
          setInvestorFormData({
            fund_name: investorData.fund_name || '',
            fund_size: investorData.fund_size || '',
            ticket_size_min: investorData.ticket_size_min || '',
            ticket_size_max: investorData.ticket_size_max || '',
            portfolio_companies: investorData.portfolio_companies || '',
            linkedin_url: investorData.linkedin_url || '',
            website_url: investorData.website_url || '',
            investment_stage: investorData.investment_stage || [],
            sectors: investorData.sectors || [],
            geographic_focus: investorData.geographic_focus || []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Update general profile data
      let avatar_url = profile?.avatar_url || null

      // Upload avatar if provided (use an existing bucket)
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('pitch-decks')
          .upload(filePath, avatarFile)
        if (uploadError) throw uploadError
        const { data: publicData } = await supabase.storage
          .from('pitch-decks')
          .getPublicUrl(filePath)
        avatar_url = publicData?.publicUrl || avatar_url
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          location: formData.location,
          avatar_url
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }

      // If mentor, upsert mentor profile data too
      if (profile?.role === 'mentor') {
        const mentorPayload = {
          user_id: user.id,
          expertise_tags: mentorFormData.expertise_tags,
          years_experience: mentorFormData.years_experience
            ? parseInt(mentorFormData.years_experience)
            : null,
          availability: mentorFormData.availability,
          is_paid: mentorFormData.is_paid,
          hourly_rate:
            mentorFormData.is_paid && mentorFormData.hourly_rate
              ? parseFloat(mentorFormData.hourly_rate)
              : null,
          currency: mentorFormData.currency,
          linkedin_url: mentorFormData.linkedin_url,
          company: mentorFormData.company,
          job_title: mentorFormData.job_title
        }

        let upsertError = null
        if (mentorProfile) {
          const { error } = await supabase
            .from('mentor_profiles')
            .update(mentorPayload)
            .eq('id', mentorProfile.id)
          upsertError = error
        } else {
          const { error } = await supabase
            .from('mentor_profiles')
            .insert(mentorPayload)
          upsertError = error
        }

        if (upsertError) throw upsertError
      }

      // If investor, upsert investor profile data too
      if (profile?.role === 'investor') {
        // Validate and clean investor data
        const cleanInvestmentStage = Array.isArray(investorFormData.investment_stage) 
          ? investorFormData.investment_stage.filter(stage => stage && stage.trim()) 
          : []
        const cleanSectors = Array.isArray(investorFormData.sectors) 
          ? investorFormData.sectors.filter(sector => sector && sector.trim()) 
          : []
        const cleanGeographicFocus = Array.isArray(investorFormData.geographic_focus) 
          ? investorFormData.geographic_focus.filter(focus => focus && focus.trim()) 
          : []

        const investorPayload = {
          user_id: user.id,
          fund_name: investorFormData.fund_name?.trim() || null,
          fund_size: investorFormData.fund_size?.trim() || null,
          ticket_size_min: investorFormData.ticket_size_min && !isNaN(investorFormData.ticket_size_min)
            ? parseInt(investorFormData.ticket_size_min)
            : null,
          ticket_size_max: investorFormData.ticket_size_max && !isNaN(investorFormData.ticket_size_max)
            ? parseInt(investorFormData.ticket_size_max)
            : null,
          portfolio_companies: investorFormData.portfolio_companies && !isNaN(investorFormData.portfolio_companies)
            ? parseInt(investorFormData.portfolio_companies)
            : null,
          linkedin_url: investorFormData.linkedin_url?.trim() || null,
          website_url: investorFormData.website_url?.trim() || null,
          investment_stage: cleanInvestmentStage,
          sectors: cleanSectors,
          geographic_focus: cleanGeographicFocus
        }

        console.log('Investor payload:', investorPayload)

        let upsertError = null
        if (investorProfile) {
          console.log('Updating existing investor profile:', investorProfile.id)
          const { data, error } = await supabase
            .from('investor_profiles')
            .update(investorPayload)
            .eq('id', investorProfile.id)
            .select()
          upsertError = error
          if (error) {
            console.error('Update error details:', error)
          }
        } else {
          console.log('Creating new investor profile')
          const { data, error } = await supabase
            .from('investor_profiles')
            .insert(investorPayload)
            .select()
          upsertError = error
          if (error) {
            console.error('Insert error details:', error)
          }
        }

        if (upsertError) {
          console.error('Investor profile upsert failed:', upsertError)
          throw upsertError
        }
      }

      toast.success('Profile updated successfully!')
      router.push('/profiles')
    } catch (error) {
      console.error('Error updating profile:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Mentor expertise tag handlers
  const addExpertiseTag = () => {
    const trimmed = newExpertiseTag.trim()
    if (!trimmed) return
    if (mentorFormData.expertise_tags.includes(trimmed)) return
    setMentorFormData(prev => ({
      ...prev,
      expertise_tags: [...prev.expertise_tags, trimmed]
    }))
    setNewExpertiseTag('')
  }

  const removeExpertiseTag = (tagToRemove) => {
    setMentorFormData(prev => ({
      ...prev,
      expertise_tags: prev.expertise_tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Investor investment stage handlers
  const addInvestmentStage = () => {
    const trimmed = newInvestmentStage.trim()
    if (!trimmed) return
    if (investorFormData.investment_stage.includes(trimmed)) return
    setInvestorFormData(prev => ({
      ...prev,
      investment_stage: [...prev.investment_stage, trimmed]
    }))
    setNewInvestmentStage('')
  }

  const removeInvestmentStage = (stageToRemove) => {
    setInvestorFormData(prev => ({
      ...prev,
      investment_stage: prev.investment_stage.filter(stage => stage !== stageToRemove)
    }))
  }

  // Investor sector handlers
  const addSector = () => {
    const trimmed = newSector.trim()
    if (!trimmed) return
    if (investorFormData.sectors.includes(trimmed)) return
    setInvestorFormData(prev => ({
      ...prev,
      sectors: [...prev.sectors, trimmed]
    }))
    setNewSector('')
  }

  const removeSector = (sectorToRemove) => {
    setInvestorFormData(prev => ({
      ...prev,
      sectors: prev.sectors.filter(sector => sector !== sectorToRemove)
    }))
  }

  // Investor geographic focus handlers
  const addGeographicFocus = () => {
    const trimmed = newGeographicFocus.trim()
    if (!trimmed) return
    if (investorFormData.geographic_focus.includes(trimmed)) return
    setInvestorFormData(prev => ({
      ...prev,
      geographic_focus: [...prev.geographic_focus, trimmed]
    }))
    setNewGeographicFocus('')
  }

  const removeGeographicFocus = (focusToRemove) => {
    setInvestorFormData(prev => ({
      ...prev,
      geographic_focus: prev.geographic_focus.filter(focus => focus !== focusToRemove)
    }))
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
        <p className="text-gray-600 mb-8">You need to be signed in to edit your profile.</p>
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
            <p className="text-gray-600 mt-1">Update your basic profile information</p>
          </div>
          <Link
            href="/profiles"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Profile
          </Link>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="City, Country"
            />
          </div>

          {/* Role-specific profile sections */}
          {profile?.role === 'mentor' && (
            <div className="pt-2 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Mentor Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={mentorFormData.job_title}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={mentorFormData.company}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Current company"
            />
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
            <input
                    type="number"
                    min="0"
                    value={mentorFormData.years_experience}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, years_experience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Years of experience"
            />
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <select
                    value={mentorFormData.availability}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, availability: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mentor LinkedIn URL</label>
            <input
              type="url"
                    value={mentorFormData.linkedin_url}
                    onChange={(e) => setMentorFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mentorFormData.is_paid}
                      onChange={(e) => setMentorFormData(prev => ({ ...prev, is_paid: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Offer Paid Mentorship</span>
                  </label>
                </div>

                {mentorFormData.is_paid && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={mentorFormData.hourly_rate}
                        onChange={(e) => setMentorFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        value={mentorFormData.currency}
                        onChange={(e) => setMentorFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Expertise Tags */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Areas of Expertise</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {mentorFormData.expertise_tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      {tag}
                      <button type="button" onClick={() => removeExpertiseTag(tag)} className="ml-2 text-blue-600 hover:text-blue-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newExpertiseTag}
                    onChange={(e) => setNewExpertiseTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpertiseTag() } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add expertise area (e.g., Product, Marketing)"
                  />
                  <button type="button" onClick={addExpertiseTag} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Investor-specific section */}
          {profile?.role === 'investor' && (
            <div className="pt-2 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Investor Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fund Name</label>
                  <input
                    type="text"
                    value={investorFormData.fund_name}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, fund_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., ABC Ventures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fund Size</label>
                  <input
                    type="text"
                    value={investorFormData.fund_size}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, fund_size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., $100M"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Ticket Size ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={investorFormData.ticket_size_min}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, ticket_size_min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Ticket Size ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={investorFormData.ticket_size_max}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, ticket_size_max: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 1000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio Companies</label>
                  <input
                    type="number"
                    min="0"
                    value={investorFormData.portfolio_companies}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, portfolio_companies: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Number of portfolio companies"
                  />
                </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investor LinkedIn URL</label>
            <input
              type="url"
                    value={investorFormData.linkedin_url}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                  <input
                    type="url"
                    value={investorFormData.website_url}
                    onChange={(e) => setInvestorFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="https://yourfund.com"
                  />
                </div>
              </div>

              {/* Investment Stages */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Investment Stages</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {investorFormData.investment_stage.map((stage, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                      {stage}
                      <button type="button" onClick={() => removeInvestmentStage(stage)} className="ml-2 text-blue-600 hover:text-blue-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newInvestmentStage}
                    onChange={(e) => setNewInvestmentStage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInvestmentStage() } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add investment stage (e.g., Seed, Series A, Series B)"
                  />
                  <button type="button" onClick={addInvestmentStage} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </div>

              {/* Sectors */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sectors of Interest</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {investorFormData.sectors.map((sector, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                      {sector}
                      <button type="button" onClick={() => removeSector(sector)} className="ml-2 text-green-600 hover:text-green-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSector() } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add sector (e.g., FinTech, HealthTech, AI/ML)"
                  />
                  <button type="button" onClick={addSector} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </div>

              {/* Geographic Focus */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Geographic Focus</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {investorFormData.geographic_focus.map((focus, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {focus}
                      <button type="button" onClick={() => removeGeographicFocus(focus)} className="ml-2 text-purple-600 hover:text-purple-800">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newGeographicFocus}
                    onChange={(e) => setNewGeographicFocus(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGeographicFocus() } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Add geographic focus (e.g., North America, Europe, Asia)"
                  />
                  <button type="button" onClick={addGeographicFocus} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/profiles"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Startup-specific management (company + team) */}
      {profile?.role === 'startup' && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Startup Profile & Team</h2>
          <p className="text-gray-600 mb-4">Manage your company details, pitch materials and team members here.</p>
          <StartupProfileManager />
        </div>
      )}
    </div>
  )
}