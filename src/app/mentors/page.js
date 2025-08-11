'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

export default function MentorsPage() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState('')
  const [selectedExperience, setSelectedExperience] = useState('')

  const expertiseAreas = [
    'Technology', 'Marketing', 'Sales', 'Finance', 'Operations',
    'Product Management', 'Human Resources', 'Legal', 'Strategy',
    'Business Development', 'Design', 'Engineering', 'Other'
  ]

  const experienceLevels = [
    '1-3 years', '4-7 years', '8-12 years', '13-20 years', '20+ years'
  ]

  useEffect(() => {
    fetchMentors()
  }, [searchTerm, selectedExpertise, selectedExperience])

  const fetchMentors = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('mentor_profiles')
        .select(`
          *,
          profiles!mentor_profiles_user_id_fkey(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('is_available', true)

      if (searchTerm) {
        query = query.or(`bio.ilike.%${searchTerm}%,expertise_areas.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
      }

      if (selectedExpertise) {
        query = query.contains('expertise_areas', [selectedExpertise])
      }

      if (selectedExperience) {
        query = query.eq('experience_level', selectedExperience)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setMentors(data || [])
    } catch (error) {
      console.error('Error fetching mentors:', error)
      toast.error('Failed to load mentors')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedExpertise('')
    setSelectedExperience('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Find Mentors
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Connect with experienced professionals who can guide your entrepreneurial journey
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Mentors
            </label>
            <input
              type="text"
              placeholder="Search by expertise, company, or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Expertise Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expertise Area
            </label>
            <select
              value={selectedExpertise}
              onChange={(e) => setSelectedExpertise(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Areas</option>
              {expertiseAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level
            </label>
            <select
              value={selectedExperience}
              onChange={(e) => setSelectedExperience(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              {experienceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedExpertise || selectedExperience) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Mentors Grid */}
          {mentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor) => (
                <Link
                  key={mentor.id}
                  href={`/mentors/${mentor.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* Profile Picture and Basic Info */}
                    <div className="flex items-center space-x-4 mb-4">
                      {mentor.profiles?.avatar_url ? (
                        <Image
                          src={mentor.profiles.avatar_url}
                          alt={mentor.profiles.full_name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {mentor.profiles?.full_name?.charAt(0) || 'M'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {mentor.profiles?.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {mentor.title} {mentor.company && `at ${mentor.company}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mentor.experience_level} experience
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {mentor.bio}
                    </p>

                    {/* Expertise Areas */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Expertise</h4>
                      <div className="flex flex-wrap gap-1">
                        {mentor.expertise_areas?.slice(0, 3).map((area, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {area}
                          </span>
                        ))}
                        {mentor.expertise_areas?.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{mentor.expertise_areas.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing and Availability */}
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        {mentor.hourly_rate ? (
                          <span className="text-green-600 font-medium">
                            ${mentor.hourly_rate}/hour
                          </span>
                        ) : (
                          <span className="text-blue-600 font-medium">
                            Free mentoring
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Available</span>
                      </div>
                    </div>

                    {/* Languages */}
                    {mentor.languages && mentor.languages.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Languages:</span>
                          <div className="flex flex-wrap gap-1">
                            {mentor.languages.slice(0, 2).map((language, index) => (
                              <span
                                key={index}
                                className="text-xs text-gray-600"
                              >
                                {language}{index < Math.min(mentor.languages.length, 2) - 1 ? ',' : ''}
                              </span>
                            ))}
                            {mentor.languages.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{mentor.languages.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No mentors found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search criteria or filters
              </p>
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}