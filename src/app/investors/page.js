'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

export default function InvestorsPage() {
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvestmentStage, setSelectedInvestmentStage] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedTicketSize, setSelectedTicketSize] = useState('')

  const investmentStages = [
    'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Late Stage'
  ]

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
    'Food & Beverage', 'Transportation', 'Real Estate', 'Entertainment',
    'Energy', 'Agriculture', 'Manufacturing', 'Other'
  ]

  const ticketSizes = [
    '$1K - $10K', '$10K - $50K', '$50K - $100K', '$100K - $500K',
    '$500K - $1M', '$1M - $5M', '$5M - $10M', '$10M+'
  ]

  useEffect(() => {
    fetchInvestors()
  }, [searchTerm, selectedInvestmentStage, selectedIndustry, selectedTicketSize])

  const fetchInvestors = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('investor_profiles')
        .select(`
          *,
          profiles!investor_profiles_user_id_fkey(
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('is_active', true)

      if (searchTerm) {
        query = query.or(`bio.ilike.%${searchTerm}%,investment_focus.ilike.%${searchTerm}%,firm_name.ilike.%${searchTerm}%`)
      }

      if (selectedInvestmentStage) {
        query = query.contains('preferred_stages', [selectedInvestmentStage])
      }

      if (selectedIndustry) {
        query = query.contains('preferred_industries', [selectedIndustry])
      }

      if (selectedTicketSize) {
        query = query.eq('typical_check_size', selectedTicketSize)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setInvestors(data || [])
    } catch (error) {
      console.error('Error fetching investors:', error)
      toast.error('Failed to load investors')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedInvestmentStage('')
    setSelectedIndustry('')
    setSelectedTicketSize('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Connect with Investors
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Find the right investors who align with your startup's vision and funding needs
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Investors
            </label>
            <input
              type="text"
              placeholder="Search by name, firm, or focus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Investment Stage Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Stage
            </label>
            <select
              value={selectedInvestmentStage}
              onChange={(e) => setSelectedInvestmentStage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stages</option>
              {investmentStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry Focus
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

          {/* Ticket Size Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check Size
            </label>
            <select
              value={selectedTicketSize}
              onChange={(e) => setSelectedTicketSize(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sizes</option>
              {ticketSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedInvestmentStage || selectedIndustry || selectedTicketSize) && (
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
              {investors.length} investor{investors.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Investors Grid */}
          {investors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investors.map((investor) => (
                <Link
                  key={investor.id}
                  href={`/investors/${investor.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* Profile Picture and Basic Info */}
                    <div className="flex items-center space-x-4 mb-4">
                      {investor.profiles?.avatar_url ? (
                        <Image
                          src={investor.profiles.avatar_url}
                          alt={investor.profiles.full_name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {investor.profiles?.full_name?.charAt(0) || 'I'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {investor.profiles?.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {investor.title} {investor.firm_name && `at ${investor.firm_name}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {investor.investor_type}
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {investor.bio}
                    </p>

                    {/* Investment Focus */}
                    {investor.investment_focus && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Investment Focus</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {investor.investment_focus}
                        </p>
                      </div>
                    )}

                    {/* Preferred Industries */}
                    {investor.preferred_industries && investor.preferred_industries.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Industries</h4>
                        <div className="flex flex-wrap gap-1">
                          {investor.preferred_industries.slice(0, 3).map((industry, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                            >
                              {industry}
                            </span>
                          ))}
                          {investor.preferred_industries.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{investor.preferred_industries.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Investment Details */}
                    <div className="space-y-2 text-sm">
                      {investor.typical_check_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check Size:</span>
                          <span className="font-medium text-green-600">
                            {investor.typical_check_size}
                          </span>
                        </div>
                      )}
                      
                      {investor.preferred_stages && investor.preferred_stages.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stages:</span>
                          <span className="font-medium">
                            {investor.preferred_stages.slice(0, 2).join(', ')}
                            {investor.preferred_stages.length > 2 && ` +${investor.preferred_stages.length - 2}`}
                          </span>
                        </div>
                      )}

                      {investor.portfolio_companies_count && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Portfolio:</span>
                          <span className="font-medium">
                            {investor.portfolio_companies_count} companies
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    {investor.location && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <span>📍</span>
                          <span>{investor.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No investors found
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