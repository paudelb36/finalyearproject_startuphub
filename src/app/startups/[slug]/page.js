'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function StartupProfilePage() {
  const params = useParams()
  const { user } = useAuth()
  const [startup, setStartup] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)

  useEffect(() => {
    if (params.slug) {
      fetchStartupData()
      if (user) {
        checkConnectionStatus()
      }
    }
  }, [params.slug, user])

  const fetchStartupData = async () => {
    try {
      // Fetch startup profile
      const { data: startupData, error: startupError } = await supabase
        .from('startup_profiles')
        .select(`
          *,
          profiles!startup_profiles_user_id_fkey(full_name, avatar_url, email)
        `)
        .eq('slug', params.slug)
        .single()

      if (startupError) throw startupError

      // Fetch team members
      const { data: teamData } = await supabase
        .from('team_members')
        .select('*')
        .eq('startup_id', startupData.id)
        .order('is_founder', { ascending: false })

      // Fetch updates
      const { data: updatesData } = await supabase
        .from('startup_updates')
        .select('*')
        .eq('startup_id', startupData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)

      setStartup(startupData)
      setTeamMembers(teamData || [])
      setUpdates(updatesData || [])
    } catch (error) {
      console.error('Error fetching startup data:', error)
      toast.error('Failed to load startup profile')
    } finally {
      setLoading(false)
    }
  }

  const checkConnectionStatus = async () => {
    if (!startup || !user) return

    const { data } = await supabase
      .from('connections')
      .select('status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${startup.user_id}),and(requester_id.eq.${startup.user_id},recipient_id.eq.${user.id})`)
      .single()

    if (data) {
      setConnectionStatus(data.status)
      setIsConnected(data.status === 'accepted')
    }
  }

  const handleConnect = async () => {
    if (!user || !startup) {
      toast.error('Please sign in to connect')
      return
    }

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          recipient_id: startup.user_id,
          connection_type: 'startup_startup',
          message: `Hi! I'd like to connect with ${startup.company_name}.`
        })

      if (error) throw error

      setConnectionStatus('pending')
      toast.success('Connection request sent!')
    } catch (error) {
      console.error('Error sending connection request:', error)
      toast.error('Failed to send connection request')
    }
  }

  const handleMessage = () => {
    if (!user) {
      toast.error('Please sign in to send messages')
      return
    }
    // Navigate to messages with this startup
    window.location.href = `/messages?user=${startup.user_id}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Startup Not Found</h1>
        <p className="text-gray-600 mb-8">The startup you're looking for doesn't exist.</p>
        <Link href="/startups" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Browse Startups
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {startup.cover_image_url && (
          <div className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            <Image
              src={startup.cover_image_url}
              alt={`${startup.company_name} cover`}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {startup.logo_url && (
                <Image
                  src={startup.logo_url}
                  alt={startup.company_name}
                  width={100}
                  height={100}
                  className="rounded-lg shadow-md"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {startup.company_name}
                </h1>
                <p className="text-xl text-gray-600 mb-4">{startup.tagline}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {startup.stage}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                    {startup.industry}
                  </span>
                  <span>📍 {startup.location}</span>
                  {startup.founded_date && (
                    <span>🗓️ Founded {new Date(startup.founded_date).getFullYear()}</span>
                  )}
                </div>
              </div>
            </div>
            
            {user && user.id !== startup.user_id && (
              <div className="flex space-x-3">
                {!isConnected && connectionStatus !== 'pending' && (
                  <button
                    onClick={handleConnect}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Connect
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{startup.description}</p>
            
            {startup.website_url && (
              <div className="mt-4">
                <a
                  href={startup.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  🌐 Visit Website →
                </a>
              </div>
            )}
          </div>

          {/* Team Section */}
          {teamMembers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-start space-x-4">
                    {member.image_url && (
                      <Image
                        src={member.image_url}
                        alt={member.name}
                        width={60}
                        height={60}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-blue-600 font-medium">{member.role}</p>
                      {member.is_founder && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                          Founder
                        </span>
                      )}
                      {member.bio && (
                        <p className="text-gray-600 text-sm mt-2">{member.bio}</p>
                      )}
                      {member.linkedin_url && (
                        <a
                          href={member.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                        >
                          LinkedIn →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updates Section */}
          {updates.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Updates</h2>
              <div className="space-y-6">
                {updates.map((update) => (
                  <div key={update.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">{update.title}</h3>
                      <span className="text-sm text-gray-500">
                        {new Date(update.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{update.content}</p>
                    {update.milestone_type && (
                      <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {update.milestone_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              {startup.employee_count && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Team Size</span>
                  <span className="font-medium">{startup.employee_count} people</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Stage</span>
                <span className="font-medium capitalize">{startup.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Industry</span>
                <span className="font-medium">{startup.industry}</span>
              </div>
              {startup.founded_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Founded</span>
                  <span className="font-medium">{new Date(startup.founded_date).getFullYear()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pitch Deck */}
          {startup.pitch_deck_url && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pitch Deck</h3>
              <a
                href={startup.pitch_deck_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📄 View Pitch Deck
              </a>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Founder</span>
                <p className="font-medium">{startup.profiles?.full_name}</p>
              </div>
              {startup.location && (
                <div>
                  <span className="text-gray-600">Location</span>
                  <p className="font-medium">{startup.location}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}