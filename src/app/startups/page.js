'use client'

import { useState, useEffect } from 'react'
import { useStore, useLoadingState } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { StartupCardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function StartupsPage() {
  const getStartups = useStore((state) => state.getStartups)
  const [startups, setStartups] = useState([])
  const { loading } = useLoadingState('startups', 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedStage, setSelectedStage] = useState('')

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
    'Food & Beverage', 'Transportation', 'Real Estate', 'Entertainment',
    'Energy', 'Agriculture', 'Manufacturing', 'Other'
  ]

  const stages = [
    'Idea Stage', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'IPO'
  ]

  useEffect(() => {
    fetchStartups()
  }, [searchTerm, selectedIndustry, selectedStage])

  const fetchStartups = async () => {
    try {
      const allStartups = await getStartups()
      let filteredStartups = allStartups || []

      // Apply client-side filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filteredStartups = filteredStartups.filter(startup => 
          startup.company_name?.toLowerCase().includes(searchLower) ||
          startup.description?.toLowerCase().includes(searchLower)
        )
      }

      if (selectedIndustry) {
        filteredStartups = filteredStartups.filter(startup => 
          startup.industry === selectedIndustry
        )
      }

      if (selectedStage) {
        filteredStartups = filteredStartups.filter(startup => 
          startup.funding_stage === selectedStage
        )
      }

      setStartups(filteredStartups)
    } catch (error) {
      console.error('Error fetching startups:', error)
      toast.error('Failed to load startups')
      setStartups([])
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedIndustry('')
    setSelectedStage('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Discover Startups
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Explore innovative startups and connect with entrepreneurs who are changing the world
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Startups
            </label>
            <input
              type="text"
              placeholder="Search by company name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stages</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedIndustry || selectedStage) && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <StartupCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {startups.length} startup{startups.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Startups Grid */}
          {startups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {startups.map((startup) => (
                <Link
                  key={startup.id}
                  href={`/startups/${startup.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Cover Image */}
                  <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                    {startup.cover_image_url && (
                      <Image
                        src={startup.cover_image_url}
                        alt={startup.company_name}
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  </div>

                  <div className="p-6">
                    {/* Logo and Company Name */}
                    <div className="flex items-center space-x-3 mb-3">
                      {startup.logo_url ? (
                        <Image
                          src={startup.logo_url}
                          alt={startup.company_name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {startup.company_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {startup.company_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {startup.profiles?.full_name}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {startup.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {startup.industry && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {startup.industry}
                        </span>
                      )}
                      {startup.funding_stage && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {startup.funding_stage}
                        </span>
                      )}
                      {startup.location && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          📍 {startup.location}
                        </span>
                      )}
                    </div>

                    {/* Funding Goal */}
                    {startup.funding_goal && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Seeking:</span> ${startup.funding_goal.toLocaleString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No startups found
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