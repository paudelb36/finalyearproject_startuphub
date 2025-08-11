'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import StartupUpdatesManager from './StartupUpdatesManager'

export default function StartupProfileManager() {
  const { user } = useAuth()
  const [startupProfile, setStartupProfile] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    company_name: '',
    tagline: '',
    description: '',
    industry: '',
    stage: 'idea',
    location: '',
    website_url: '',
    founded_date: '',
    employee_count: 1,
    funding_stage: 'pre_seed',
    funding_goal: '',
    funding_raised: '',
    slug: ''
  })
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    role: '',
    bio: '',
    linkedin_url: '',
    is_founder: false
  })
  const [showAddTeamMember, setShowAddTeamMember] = useState(false)
  const [editingTeamMember, setEditingTeamMember] = useState(null)
  const [pitchDeckFile, setPitchDeckFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [coverImageFile, setCoverImageFile] = useState(null)

  useEffect(() => {
    if (user) {
      fetchStartupProfile()
    }
  }, [user])

  const fetchStartupProfile = async () => {
    try {
      setLoading(true)
      
      // Fetch startup profile
      const { data: profileData, error: profileError } = await supabase
        .from('startup_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (profileData) {
        setStartupProfile(profileData)
        setFormData({
          company_name: profileData.company_name || '',
          tagline: profileData.tagline || '',
          description: profileData.description || '',
          industry: profileData.industry || '',
          stage: profileData.stage || 'idea',
          location: profileData.location || '',
          website_url: profileData.website_url || '',
          founded_date: profileData.founded_date || '',
          employee_count: profileData.employee_count || 1,
          funding_stage: profileData.funding_stage || 'pre_seed',
          funding_goal: profileData.funding_goal || '',
          funding_raised: profileData.funding_raised || '',
          slug: profileData.slug || ''
        })

        // Fetch team members
        const { data: teamData, error: teamError } = await supabase
          .from('team_members')
          .select('*')
          .eq('startup_id', profileData.id)
          .order('created_at', { ascending: true })

        if (teamError) throw teamError
        setTeamMembers(teamData || [])
      }
    } catch (error) {
      console.error('Error fetching startup profile:', error)
      toast.error('Failed to load startup profile')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (companyName) => {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const uploadFile = async (file, bucket, path) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${path}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      
      if (!formData.company_name.trim()) {
        toast.error('Company name is required')
        return
      }

      const slug = generateSlug(formData.company_name)
      const profileData = {
        ...formData,
        slug,
        user_id: user.id,
        // Convert numeric fields to proper types
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        funding_goal: formData.funding_goal ? parseFloat(formData.funding_goal) : null,
        funding_raised: formData.funding_raised ? parseFloat(formData.funding_raised) : null,
        founded_date: formData.founded_date || null
      }

      // Upload files if selected
      if (logoFile) {
        profileData.logo_url = await uploadFile(logoFile, 'startup-assets', 'logos')
      }
      if (coverImageFile) {
        profileData.cover_image_url = await uploadFile(coverImageFile, 'startup-assets', 'covers')
      }
      if (pitchDeckFile) {
        profileData.pitch_deck_url = await uploadFile(pitchDeckFile, 'startup-assets', 'pitch-decks')
      }

      let result
      if (startupProfile) {
        // Update existing profile
        result = await supabase
          .from('startup_profiles')
          .update(profileData)
          .eq('id', startupProfile.id)
          .select()
          .single()
      } else {
        // Create new profile
        result = await supabase
          .from('startup_profiles')
          .insert(profileData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      setStartupProfile(result.data)
      setIsEditing(false)
      setPitchDeckFile(null)
      setLogoFile(null)
      setCoverImageFile(null)
      toast.success('Startup profile saved successfully!')
    } catch (error) {
      console.error('Error saving startup profile:', error)
      toast.error(`Failed to save startup profile: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeamMember = async () => {
    try {
      if (!startupProfile) {
        toast.error('Please save your startup profile first')
        return
      }

      if (!newTeamMember.name.trim() || !newTeamMember.role.trim()) {
        toast.error('Name and role are required')
        return
      }

      const { data, error } = await supabase
        .from('team_members')
        .insert({
          ...newTeamMember,
          startup_id: startupProfile.id
        })
        .select()
        .single()

      if (error) throw error

      setTeamMembers([...teamMembers, data])
      setNewTeamMember({
        name: '',
        role: '',
        bio: '',
        linkedin_url: '',
        is_founder: false
      })
      setShowAddTeamMember(false)
      toast.success('Team member added successfully!')
    } catch (error) {
      console.error('Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  }

  const handleUpdateTeamMember = async () => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update(editingTeamMember)
        .eq('id', editingTeamMember.id)

      if (error) throw error

      setTeamMembers(teamMembers.map(member => 
        member.id === editingTeamMember.id ? editingTeamMember : member
      ))
      setEditingTeamMember(null)
      toast.success('Team member updated successfully!')
    } catch (error) {
      console.error('Error updating team member:', error)
      toast.error('Failed to update team member')
    }
  }

  const handleDeleteTeamMember = async (memberId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setTeamMembers(teamMembers.filter(member => member.id !== memberId))
      toast.success('Team member removed successfully!')
    } catch (error) {
      console.error('Error deleting team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete your startup profile? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('startup_profiles')
        .delete()
        .eq('id', startupProfile.id)

      if (error) throw error

      setStartupProfile(null)
      setTeamMembers([])
      setFormData({
        company_name: '',
        tagline: '',
        description: '',
        industry: '',
        stage: 'idea',
        location: '',
        website_url: '',
        founded_date: '',
        employee_count: 1,
        funding_stage: 'pre_seed',
        funding_goal: '',
        funding_raised: '',
        slug: ''
      })
      toast.success('Startup profile deleted successfully!')
    } catch (error) {
      console.error('Error deleting startup profile:', error)
      toast.error('Failed to delete startup profile')
    } finally {
      setLoading(false)
    }
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
            {startupProfile ? 'Startup Profile' : 'Create Startup Profile'}
          </h2>
          <div className="flex space-x-2">
            {startupProfile && !isEditing && (
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
            {!startupProfile && (
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
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({...formData, tagline: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Brief description of your startup"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              disabled={!isEditing && startupProfile}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Detailed description of your startup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({...formData, industry: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., FinTech, HealthTech, EdTech"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stage
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({...formData, stage: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
            >
              <option value="idea">Idea</option>
              <option value="prototype">Prototype</option>
              <option value="mvp">MVP</option>
              <option value="early_revenue">Early Revenue</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="City, Country"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({...formData, website_url: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Founded Date
            </label>
            <input
              type="date"
              value={formData.founded_date}
              onChange={(e) => setFormData({...formData, founded_date: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Count
            </label>
            <input
              type="number"
              min="1"
              value={formData.employee_count}
              onChange={(e) => setFormData({...formData, employee_count: parseInt(e.target.value) || 1})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Stage
            </label>
            <select
              value={formData.funding_stage}
              onChange={(e) => setFormData({...formData, funding_stage: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
            >
              <option value="pre_seed">Pre-Seed</option>
              <option value="seed">Seed</option>
              <option value="series_a">Series A</option>
              <option value="series_b">Series B</option>
              <option value="series_c">Series C</option>
              <option value="series_d">Series D</option>
              <option value="ipo">IPO</option>
              <option value="acquired">Acquired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Goal ($)
            </label>
            <input
              type="number"
              min="0"
              value={formData.funding_goal}
              onChange={(e) => setFormData({...formData, funding_goal: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Target funding amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Raised ($)
            </label>
            <input
              type="number"
              min="0"
              value={formData.funding_raised}
              onChange={(e) => setFormData({...formData, funding_raised: e.target.value})}
              disabled={!isEditing && startupProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Amount already raised"
            />
          </div>

          {/* File Uploads */}
          {(isEditing || !startupProfile) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImageFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pitch Deck (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPitchDeckFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </>
          )}
        </div>

        {/* Team Members Section */}
        {startupProfile && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Team Members</h3>
              <button
                onClick={() => setShowAddTeamMember(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Team Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingTeamMember(member)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTeamMember(member.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{member.role}</p>
                  {member.is_founder && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                      Founder
                    </span>
                  )}
                  {member.bio && <p className="text-sm text-gray-700 mb-2">{member.bio}</p>}
                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Startup Updates Section */}
        {startupProfile && (
          <div className="mt-8">
            <StartupUpdatesManager startupId={startupProfile.id} />
          </div>
        )}

        {/* Add Team Member Modal */}
        {showAddTeamMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg text-black font-semibold mb-4">Add Team Member</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name *"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({...newTeamMember, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <input
                  type="text"
                  placeholder="Role *"
                  value={newTeamMember.role}
                  onChange={(e) => setNewTeamMember({...newTeamMember, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <textarea
                  placeholder="Bio"
                  value={newTeamMember.bio}
                  onChange={(e) => setNewTeamMember({...newTeamMember, bio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                />
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={newTeamMember.linkedin_url}
                  onChange={(e) => setNewTeamMember({...newTeamMember, linkedin_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTeamMember.is_founder}
                    onChange={(e) => setNewTeamMember({...newTeamMember, is_founder: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Is Founder</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setShowAddTeamMember(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeamMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Team Member Modal */}
        {editingTeamMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg text-black font-semibold mb-4">Edit Team Member</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name *"
                  value={editingTeamMember.name}
                  onChange={(e) => setEditingTeamMember({...editingTeamMember, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <input
                  type="text"
                  placeholder="Role *"
                  value={editingTeamMember.role}
                  onChange={(e) => setEditingTeamMember({...editingTeamMember, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <textarea
                  placeholder="Bio"
                  value={editingTeamMember.bio}
                  onChange={(e) => setEditingTeamMember({...editingTeamMember, bio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                />
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={editingTeamMember.linkedin_url}
                  onChange={(e) => setEditingTeamMember({...editingTeamMember, linkedin_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingTeamMember.is_founder}
                    onChange={(e) => setEditingTeamMember({...editingTeamMember, is_founder: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Is Founder</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setEditingTeamMember(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTeamMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}