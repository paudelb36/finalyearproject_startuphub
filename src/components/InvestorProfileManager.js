'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'

export default function InvestorProfileManager() {
  const { user } = useAuth()
  const [investorProfile, setInvestorProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    investment_stage: [],
    ticket_size_min: '',
    ticket_size_max: '',
    sectors: [],
    geographic_focus: [],
    fund_name: '',
    fund_size: '',
    portfolio_companies: '',
    linkedin_url: '',
    website_url: ''
  })
  const [newInvestmentStage, setNewInvestmentStage] = useState('')
  const [newSector, setNewSector] = useState('')
  const [newGeographicFocus, setNewGeographicFocus] = useState('')

  useEffect(() => {
    if (user) {
      fetchInvestorProfile()
    }
  }, [user])

  const fetchInvestorProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setInvestorProfile(data)
        setFormData({
          investment_stage: data.investment_stage || [],
          ticket_size_min: data.ticket_size_min || '',
          ticket_size_max: data.ticket_size_max || '',
          sectors: data.sectors || [],
          geographic_focus: data.geographic_focus || [],
          fund_name: data.fund_name || '',
          fund_size: data.fund_size || '',
          portfolio_companies: data.portfolio_companies || '',
          linkedin_url: data.linkedin_url || '',
          website_url: data.website_url || ''
        })
      } else {
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error fetching investor profile:', error)
      toast.error('Failed to load investor profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)

      const profileData = {
        user_id: user.id,
        investment_stage: formData.investment_stage,
        ticket_size_min: formData.ticket_size_min ? parseInt(formData.ticket_size_min) : null,
        ticket_size_max: formData.ticket_size_max ? parseInt(formData.ticket_size_max) : null,
        sectors: formData.sectors,
        geographic_focus: formData.geographic_focus,
        fund_name: formData.fund_name,
        fund_size: formData.fund_size,
        portfolio_companies: formData.portfolio_companies ? parseInt(formData.portfolio_companies) : null,
        linkedin_url: formData.linkedin_url,
        website_url: formData.website_url
      }

      let result
      if (investorProfile) {
        result = await supabase
          .from('investor_profiles')
          .update(profileData)
          .eq('id', investorProfile.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('investor_profiles')
          .insert(profileData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      setInvestorProfile(result.data)
      setIsEditing(false)
      toast.success('Investor profile saved successfully!')
    } catch (error) {
      console.error('Error saving investor profile:', error)
      toast.error(`Failed to save investor profile: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete your investor profile? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('investor_profiles')
        .delete()
        .eq('id', investorProfile.id)

      if (error) throw error

      setInvestorProfile(null)
      setFormData({
        investment_stage: [],
        ticket_size_min: '',
        ticket_size_max: '',
        sectors: [],
        geographic_focus: [],
        fund_name: '',
        fund_size: '',
        portfolio_companies: '',
        linkedin_url: '',
        website_url: ''
      })
      setIsEditing(true)
      toast.success('Investor profile deleted successfully')
    } catch (error) {
      console.error('Error deleting investor profile:', error)
      toast.error('Failed to delete investor profile')
    } finally {
      setLoading(false)
    }
  }

  const addInvestmentStage = () => {
    if (newInvestmentStage.trim() && !formData.investment_stage.includes(newInvestmentStage.trim())) {
      setFormData({
        ...formData,
        investment_stage: [...formData.investment_stage, newInvestmentStage.trim()]
      })
      setNewInvestmentStage('')
    }
  }

  const removeInvestmentStage = (stageToRemove) => {
    setFormData({
      ...formData,
      investment_stage: formData.investment_stage.filter(stage => stage !== stageToRemove)
    })
  }

  const addSector = () => {
    if (newSector.trim() && !formData.sectors.includes(newSector.trim())) {
      setFormData({
        ...formData,
        sectors: [...formData.sectors, newSector.trim()]
      })
      setNewSector('')
    }
  }

  const removeSector = (sectorToRemove) => {
    setFormData({
      ...formData,
      sectors: formData.sectors.filter(sector => sector !== sectorToRemove)
    })
  }

  const addGeographicFocus = () => {
    if (newGeographicFocus.trim() && !formData.geographic_focus.includes(newGeographicFocus.trim())) {
      setFormData({
        ...formData,
        geographic_focus: [...formData.geographic_focus, newGeographicFocus.trim()]
      })
      setNewGeographicFocus('')
    }
  }

  const removeGeographicFocus = (focusToRemove) => {
    setFormData({
      ...formData,
      geographic_focus: formData.geographic_focus.filter(focus => focus !== focusToRemove)
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
            {investorProfile ? 'Investor Profile' : 'Create Investor Profile'}
          </h2>
          <div className="flex space-x-2">
            {investorProfile && !isEditing && (
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
            {!investorProfile && (
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
              Fund Name
            </label>
            <input
              type="text"
              value={formData.fund_name}
              onChange={(e) => setFormData({...formData, fund_name: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., ABC Ventures"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fund Size
            </label>
            <input
              type="text"
              value={formData.fund_size}
              onChange={(e) => setFormData({...formData, fund_size: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., $100M"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Ticket Size ($)
            </label>
            <input
              type="number"
              min="0"
              value={formData.ticket_size_min}
              onChange={(e) => setFormData({...formData, ticket_size_min: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., 50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Ticket Size ($)
            </label>
            <input
              type="number"
              min="0"
              value={formData.ticket_size_max}
              onChange={(e) => setFormData({...formData, ticket_size_max: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="e.g., 1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Companies
            </label>
            <input
              type="number"
              min="0"
              value={formData.portfolio_companies}
              onChange={(e) => setFormData({...formData, portfolio_companies: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="Number of portfolio companies"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({...formData, website_url: e.target.value})}
              disabled={!isEditing && investorProfile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
              placeholder="https://yourfund.com"
            />
          </div>
        </div>

        {/* Investment Stages */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Investment Stages
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.investment_stage.map((stage, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {stage}
                {(isEditing || !investorProfile) && (
                  <button
                    onClick={() => removeInvestmentStage(stage)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {(isEditing || !investorProfile) && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newInvestmentStage}
                onChange={(e) => setNewInvestmentStage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInvestmentStage()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Add investment stage (e.g., Seed, Series A, Series B)"
              />
              <button
                onClick={addInvestmentStage}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Sectors */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sectors of Interest
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.sectors.map((sector, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {sector}
                {(isEditing || !investorProfile) && (
                  <button
                    onClick={() => removeSector(sector)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {(isEditing || !investorProfile) && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSector()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Add sector (e.g., FinTech, HealthTech, AI/ML)"
              />
              <button
                onClick={addSector}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Geographic Focus */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Geographic Focus
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.geographic_focus.map((focus, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
              >
                {focus}
                {(isEditing || !investorProfile) && (
                  <button
                    onClick={() => removeGeographicFocus(focus)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {(isEditing || !investorProfile) && (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newGeographicFocus}
                onChange={(e) => setNewGeographicFocus(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addGeographicFocus()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Add geographic focus (e.g., North America, Europe, Asia)"
              />
              <button
                onClick={addGeographicFocus}
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