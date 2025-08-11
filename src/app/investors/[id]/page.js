'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function InvestorProfilePage() {
  const params = useParams()
  const { user } = useAuth()
  const [investor, setInvestor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)

  useEffect(() => {
    if (params.id) {
      fetchInvestorData()
      if (user) {
        checkConnectionStatus()
      }
    }
  }, [params.id, user])

  const fetchInvestorData = async () => {
    try {
      const { data: investorData, error } = await supabase
        .from('investor_profiles')
        .select(`
          *,
          profiles!investor_profiles_user_id_fkey(id, full_name, avatar_url, email, bio, location)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setInvestor(investorData)
    } catch (error) {
      console.error('Error fetching investor data:', error)
      toast.error('Failed to load investor profile')
    } finally {
      setLoading(false)
    }
  }

  const checkConnectionStatus = async () => {
    if (!investor || !user) return

    const { data } = await supabase
      .from('connections')
      .select('status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${investor.user_id}),and(requester_id.eq.${investor.user_id},recipient_id.eq.${user.id})`)
      .single()

    if (data) {
      setConnectionStatus(data.status)
      setIsConnected(data.status === 'accepted')
    }
  }

  const handleConnect = async () => {
    if (!user || !investor) {
      toast.error('Please sign in to connect')
      return
    }

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          recipient_id: investor.user_id,
          connection_type: 'startup_investor',
          message: `Hi! I'd like to connect to discuss potential investment opportunities.`
        })

      if (error) throw error

      setConnectionStatus('pending')
      toast.success('Investment inquiry sent!')
    } catch (error) {
      console.error('Error sending connection request:', error)
      toast.error('Failed to send investment inquiry')
    }
  }

  const handleMessage = () => {
    if (!user) {
      toast.error('Please sign in to send messages')
      return
    }
    window.location.href = `/messages?user=${investor.user_id}`
  }

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!investor) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Investor Not Found</h1>
        <p className="text-gray-600 mb-8">The investor you're looking for doesn't exist.</p>
        <Link href="/investors" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Browse Investors
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {investor.profiles?.avatar_url && (
              <Image
                src={investor.profiles.avatar_url}
                alt={investor.profiles.full_name}
                width={120}
                height={120}
                className="rounded-full shadow-md"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {investor.profiles?.full_name}
              </h1>
              {investor.fund_name && (
                <p className="text-xl text-gray-600 mb-2">{investor.fund_name}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  💰 Active Investor
                </span>
                {investor.portfolio_companies && (
                  <span>📊 {investor.portfolio_companies} portfolio companies</span>
                )}
                {investor.profiles?.location && (
                  <span>📍 {investor.profiles.location}</span>
                )}
              </div>
            </div>
          </div>
          
          {user && user.id !== investor.user_id && (
            <div className="flex space-x-3">
              {!isConnected && connectionStatus !== 'pending' && (
                <button
                  onClick={handleConnect}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Request Investment
                </button>
              )}
              {connectionStatus === 'pending' && (
                <button disabled className="bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed">
                  Request Sent
                </button>
              )}
              {isConnected && (
                <button
                  onClick={handleMessage}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Message
                </button>
              )}
              <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Share
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">
              {investor.profiles?.bio || 'No bio available.'}
            </p>
            
            <div className="mt-6 flex space-x-4">
              {investor.website_url && (
                <a
                  href={investor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  🌐 Website →
                </a>
              )}
              {investor.linkedin_url && (
                <a
                  href={investor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  💼 LinkedIn →
                </a>
              )}
            </div>
          </div>

          {/* Investment Focus */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Investment Focus</h2>
            
            {/* Investment Stages */}
            {investor.investment_stage && investor.investment_stage.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Preferred Stages</h3>
                <div className="flex flex-wrap gap-2">
                  {investor.investment_stage.map((stage, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize"
                    >
                      {stage.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sectors */}
            {investor.sectors && investor.sectors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Sectors of Interest</h3>
                <div className="flex flex-wrap gap-2">
                  {investor.sectors.map((sector, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Geographic Focus */}
            {investor.geographic_focus && investor.geographic_focus.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Geographic Focus</h3>
                <div className="flex flex-wrap gap-2">
                  {investor.geographic_focus.map((location, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Investment Approach */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Approach</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-blue-600 text-xl">🔍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Due Diligence</h3>
                  <p className="text-gray-600 text-sm">
                    Thorough evaluation of business model, market, and team.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-green-600 text-xl">🤝</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Hands-on Support</h3>
                  <p className="text-gray-600 text-sm">
                    Active involvement in strategic decisions and growth planning.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <span className="text-purple-600 text-xl">🌐</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Network Access</h3>
                  <p className="text-gray-600 text-sm">
                    Connect portfolio companies with customers, partners, and talent.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <span className="text-yellow-600 text-xl">📈</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Long-term Vision</h3>
                  <p className="text-gray-600 text-sm">
                    Focus on sustainable growth and long-term value creation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Investment Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h3>
            <div className="space-y-3">
              {investor.ticket_size_min && investor.ticket_size_max && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Size</span>
                  <span className="font-medium">
                    {formatCurrency(investor.ticket_size_min)} - {formatCurrency(investor.ticket_size_max)}
                  </span>
                </div>
              )}
              {investor.fund_size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fund Size</span>
                  <span className="font-medium">{investor.fund_size}</span>
                </div>
              )}
              {investor.portfolio_companies && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Portfolio</span>
                  <span className="font-medium">{investor.portfolio_companies} companies</span>
                </div>
              )}
            </div>
          </div>

          {/* Fund Information */}
          {investor.fund_name && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fund Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Fund Name</span>
                  <p className="font-medium">{investor.fund_name}</p>
                </div>
                {investor.fund_size && (
                  <div>
                    <span className="text-gray-600">Fund Size</span>
                    <p className="font-medium">{investor.fund_size}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Name</span>
                <p className="font-medium">{investor.profiles?.full_name}</p>
              </div>
              {investor.profiles?.location && (
                <div>
                  <span className="text-gray-600">Location</span>
                  <p className="font-medium">{investor.profiles.location}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                {investor.linkedin_url && (
                  <a
                    href={investor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 font-medium text-sm mb-2"
                  >
                    💼 LinkedIn Profile →
                  </a>
                )}
                {investor.website_url && (
                  <a
                    href={investor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    🌐 Website →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Investment Criteria */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What We Look For</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Strong founding team</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Large addressable market</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Scalable business model</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Clear competitive advantage</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Proven traction</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}