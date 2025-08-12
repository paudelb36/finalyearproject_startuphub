'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'

export default function MentorProfileManager() {
  const { user } = useAuth()
  const [mentorProfile, setMentorProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (user) {
      fetchMentorProfile()
    }
  }, [user])

  const fetchMentorProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setMentorProfile(data)
        setFormData({
          expertise_tags: data.expertise_tags || [],
          years_experience: data.years_experience || '',
          availability: data.availability || 'available',
          is_paid: data.is_paid || false,
          hourly_rate: data.hourly_rate || '',
          currency: data.currency || 'USD',
          linkedin_url: data.linkedin_url || '',
          company: data.company || '',
          job_title: data.job_title || ''
        })
      } else {
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error fetching mentor profile:', error)
      toast.error('Failed to load mentor profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)

      const profileData = {
        user_id: user.id,
        expertise_tags: formData.expertise_tags,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        availability: formData.availability,
        is_paid: formData.is_paid,
        hourly_rate: formData.is_paid && formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        currency: formData.currency,
        linkedin_url: formData.linkedin_url,
        company: formData.company,
        job_title: formData.job_title
      }

      let result
      if (mentorProfile) {
        result = await supabase
          .from('mentor_profiles')
          .update(profileData)
          .eq('id', mentorProfile.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('mentor_profiles')
          .insert(profileData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      setMentorProfile(result.data)
      setIsEditing(false)
      toast.success('Mentor profile saved successfully!')
    } catch (error) {
      console.error('Error saving mentor profile:', error)
      toast.error(`Failed to save mentor profile: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete your mentor profile? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('mentor_profiles')
        .delete()
        .eq('id', mentorProfile.id)

      if (error) throw error

      setMentorProfile(null)
      setFormData({
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
      setIsEditing(true)
      toast.success('Mentor profile deleted successfully')
    } catch (error) {
      console.error('Error deleting mentor profile:', error)
      toast.error('Failed to delete mentor profile')
    } finally {
      setLoading(false)
    }
  }

  const addExpertiseTag = () => {
    if (newExpertiseTag.trim() && !formData.expertise_tags.includes(newExpertiseTag.trim())) {
      setFormData({
        ...formData,
        expertise_tags: [...formData.expertise_tags, newExpertiseTag.trim()]
      })
      setNewExpertiseTag('')
    }
  }

  const removeExpertiseTag = (tagToRemove) => {
    setFormData({
      ...formData,
      expertise_tags: formData.expertise_tags.filter(tag => tag !== tagToRemove)
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mentorProfile ? 'Mentor Profile' : 'Create Mentor Profile'}
          </h2>
          <div className="flex space-x-2">
            {mentorProfile && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleDeleteProfile}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Delete Profile
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSaveProfile}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            )}
            {!mentorProfile && (
              <button
                onClick={handleSaveProfile}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({...formData, job_title: e.target.value})}
              disabled={!isEditing && mentorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              disabled={!isEditing && mentorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Current company"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              value={formData.years_experience}
              onChange={(e) => setFormData({...formData, years_experience: e.target.value})}
              disabled={!isEditing && mentorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Years of experience"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability
            </label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({...formData, availability: e.target.value})}
              disabled={!isEditing && mentorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
              disabled={!isEditing && mentorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_paid}
                onChange={(e) => setFormData({...formData, is_paid: e.target.checked})}
                disabled={!isEditing && mentorProfile}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Offer Paid Mentorship</span>
            </label>
          </div>

          {formData.is_paid && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  disabled={!isEditing && mentorProfile}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  disabled={!isEditing && mentorProfile}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Areas of Expertise
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.expertise_tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {tag}
                {(isEditing || !mentorProfile) && (
                  <button
                    onClick={() => removeExpertiseTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {(isEditing || !mentorProfile) && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newExpertiseTag}
                onChange={(e) => setNewExpertiseTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExpertiseTag()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Add expertise area (e.g., Product Management, Marketing)"
              />
              <button
                onClick={addExpertiseTag}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}