import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserConnections } from '@/lib/api/connections'
import { getMentorshipRequests, getInvestmentRequests } from '@/lib/api/requests'
import { getUserEventRegistrations } from '@/lib/api/eventRegistration'

// Simple cache to avoid redundant API calls
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const getCacheKey = (userId, type) => `${userId}_${type}`

const getCachedData = (key) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * Dashboard Data Service
 * Centralized data fetching for all dashboard types with progressive loading
 */

// Essential data that loads immediately
export const fetchEssentialData = async (user, profile) => {
  try {
    const userType = profile?.role
    const cacheKey = getCacheKey(user.id, 'essential')
    
    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      return cachedData
    }

    // Load only critical stats first
    const stats = await fetchUserStats(user, profile)
    
    const result = {
      stats,
      userType,
      loading: false
    }
    
    // Cache the result
    setCachedData(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('Error fetching essential data:', error)
    return {
      stats: getDefaultStats(profile?.role),
      userType: profile?.role,
      loading: false,
      error: error.message
    }
  }
}

// Secondary data that loads after essential data
export const fetchSecondaryData = async (user, profile) => {
  try {
    const cacheKey = getCacheKey(user.id, 'secondary')
    
    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      return cachedData
    }

    // Load secondary data in parallel
    const [requests, connections, recentActivity] = await Promise.all([
      fetchUserRequests(user, profile),
      fetchUserConnections(user, profile),
      fetchRecentActivity(user, profile)
    ])

    const result = {
      requests,
      connections,
      recentActivity
    }
    
    // Cache the result
    setCachedData(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('Error fetching secondary data:', error)
    return {
      requests: [],
      connections: [],
      recentActivity: [],
      error: error.message
    }
  }
}

// Tertiary data that loads last (non-critical)
export const fetchTertiaryData = async (user, profile) => {
  try {
    const [recommendations, events, conversations] = await Promise.all([
      fetchRecommendations(user, profile),
      fetchRegisteredEvents(user, profile),
      fetchConversations(user, profile)
    ])

    return {
      recommendations,
      events,
      conversations
    }
  } catch (error) {
    console.error('Error fetching tertiary data:', error)
    return {
      recommendations: [],
      events: [],
      conversations: [],
      error: error.message
    }
  }
}

// Optimized stats fetching for all user types
export const fetchUserStats = async (user, profile) => {
  try {
    const userType = profile?.role

    switch (userType) {
      case 'startup':
        return await fetchStartupStats(user.id)
      case 'mentor':
        return await fetchMentorStats(user.id)
      case 'investor':
        return await fetchInvestorStats(user.id)
      default:
        return getDefaultStats(userType)
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return getDefaultStats(profile?.role)
  }
}

// Startup-specific stats
const fetchStartupStats = async (userId) => {
  const [connectionsResult, mentorshipResult, investmentResult] = await Promise.all([
    supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .eq('status', 'accepted'),
    
    supabase
      .from('mentorship_requests')
      .select('id', { count: 'exact' })
      .eq('startup_id', userId),
    
    supabase
      .from('investment_requests')
      .select('id', { count: 'exact' })
      .eq('startup_id', userId)
  ])

  return {
    connections: connectionsResult.count || 0,
    mentorshipRequests: mentorshipResult.count || 0,
    investmentRequests: investmentResult.count || 0,
    fundingRaised: 0 // This would come from startup profile
  }
}

// Mentor-specific stats
const fetchMentorStats = async (userId) => {
  const [connectionsResult, pendingRequestsResult, activeMentorshipsResult] = await Promise.all([
    supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .eq('status', 'accepted'),
    
    supabase
      .from('mentorship_requests')
      .select('id', { count: 'exact' })
      .eq('mentor_id', userId)
      .eq('status', 'pending'),
    
    supabase
      .from('mentorship_requests')
      .select('id', { count: 'exact' })
      .eq('mentor_id', userId)
      .eq('status', 'accepted')
  ])

  return {
    connections: connectionsResult.count || 0,
    mentorshipRequests: pendingRequestsResult.count || 0,
    activeMentorships: activeMentorshipsResult.count || 0,
    totalMentees: activeMentorshipsResult.count || 0
  }
}

// Investor-specific stats
const fetchInvestorStats = async (userId) => {
  const [connectionsResult, pendingRequestsResult, activeInvestmentsResult] = await Promise.all([
    supabase
      .from('connections')
      .select('id', { count: 'exact' })
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .eq('status', 'accepted'),
    
    supabase
      .from('investment_requests')
      .select('id', { count: 'exact' })
      .eq('investor_id', userId)
      .eq('status', 'pending'),
    
    supabase
      .from('investment_requests')
      .select('id', { count: 'exact' })
      .eq('investor_id', userId)
      .eq('status', 'accepted')
  ])

  return {
    connections: connectionsResult.count || 0,
    investmentRequests: pendingRequestsResult.count || 0,
    activeInvestments: activeInvestmentsResult.count || 0,
    totalInvested: 0 // This would come from transactions table
  }
}

// Fetch user requests based on role with optimized queries
const fetchUserRequests = async (user, profile) => {
  try {
    const userType = profile?.role
    
    switch (userType) {
      case 'startup':
        const [mentorshipRequests, investmentRequests] = await Promise.all([
          supabase
            .from('mentorship_requests')
            .select('id, status, created_at, mentor_id')
            .eq('startup_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('investment_requests')
            .select('id, status, created_at, investor_id')
            .eq('startup_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        ])
        return {
          mentorship: mentorshipRequests.data || [],
          investment: investmentRequests.data || []
        }
      
      case 'mentor':
        const mentorRequests = await supabase
          .from('mentorship_requests')
          .select('id, status, created_at, startup_id')
          .eq('mentor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        return {
          mentorship: mentorRequests.data || [],
          investment: []
        }
      
      case 'investor':
        const investorRequests = await supabase
          .from('investment_requests')
          .select('id, status, created_at, startup_id')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        return {
          mentorship: [],
          investment: investorRequests.data || []
        }
      
      default:
        return { mentorship: [], investment: [] }
    }
  } catch (error) {
    console.error('Error fetching user requests:', error)
    return { mentorship: [], investment: [] }
  }
}

// Fetch user connections with optimized query
const fetchUserConnections = async (user, profile) => {
  try {
    const { data: connections } = await supabase
      .from('connections')
      .select('id, status, created_at, requester_id, target_id')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(20)
    
    return connections || []
  } catch (error) {
    console.error('Error fetching connections:', error)
    return []
  }
}

// Fetch recent activity with optimized queries
const fetchRecentActivity = async (user, profile) => {
  try {
    const userType = profile?.role
    
    const [connectionsData, mentorshipData, investmentData] = await Promise.all([
      supabase
        .from('connections')
        .select('id, created_at, status, requester_id, target_id')
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5),
      
      userType === 'startup' ? supabase
        .from('mentorship_requests')
        .select('id, created_at, status, startup_id, mentor_id')
        .eq('startup_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5) : Promise.resolve({ data: [] }),
      
      userType === 'startup' ? supabase
        .from('investment_requests')
        .select('id, created_at, status, startup_id, investor_id')
        .eq('startup_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5) : Promise.resolve({ data: [] })
    ])

    const activities = []
    
    connectionsData.data?.forEach(conn => {
      activities.push({
        id: `conn-${conn.id}`,
        type: 'connection',
        timestamp: conn.created_at,
        status: conn.status
      })
    })
    
    mentorshipData.data?.forEach(req => {
      activities.push({
        id: `mentor-${req.id}`,
        type: 'mentorship',
        timestamp: req.created_at,
        status: req.status
      })
    })
    
    investmentData.data?.forEach(req => {
      activities.push({
        id: `invest-${req.id}`,
        type: 'investment',
        timestamp: req.created_at,
        status: req.status
      })
    })

    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 7)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

// Fetch recommendations based on user type and profile
const fetchRecommendations = async (user, profile) => {
  try {
    const userType = profile?.role
    const roleData = profile?.roleSpecificData

    if (!userType || !roleData) {
      return []
    }

    switch (userType) {
      case 'startup':
        return await fetchStartupRecommendations(user, roleData)
      case 'mentor':
        return await fetchMentorRecommendations(user, roleData)
      case 'investor':
        return await fetchInvestorRecommendations(user, roleData)
      default:
        return []
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return []
  }
}

// Fetch startup-specific recommendations
const fetchStartupRecommendations = async (user, startupData) => {
  try {
    const { data: mentors, error } = await supabase
      .from('mentor_profiles')
      .select(`
        id,
        user_id,
        expertise_tags,
        years_experience,
        hourly_rate,
        profiles(
          id,
          full_name,
          avatar_url,
          location
        )
      `)
      .limit(5)

    if (error) {
      console.error('Supabase error in fetchStartupRecommendations:', error)
      // Return fallback recommendations for testing
      return [
        {
          id: 'test-1',
          type: 'mentor',
          title: 'Jennifer Smith',
          description: 'Engineering, Scaling Teams • 15 years experience',
          image: null,
          location: 'San Francisco, CA',
          rate: 250,
          link: '/mentors/test-1'
        },
        {
          id: 'test-2',
          type: 'mentor',
          title: 'Mark Thompson',
          description: 'B2B SaaS, Fundraising • 12 years experience',
          image: null,
          location: 'New York, NY',
          rate: 300,
          link: '/mentors/test-2'
        }
      ]
    }

    const recommendations = mentors?.map(mentor => ({
      id: mentor.id,
      type: 'mentor',
      title: mentor.profiles?.full_name || 'Mentor',
      description: `${mentor.expertise_tags?.join(', ') || 'Mentor'} • ${mentor.years_experience || 0} years experience`,
      image: mentor.profiles?.avatar_url,
      location: mentor.profiles?.location,
      rate: mentor.hourly_rate,
      link: `/mentors/${mentor.id}`
    })) || []
    
    // If no data returned, provide fallback
    if (recommendations.length === 0) {
      return [
        {
          id: 'fallback-1',
          type: 'mentor',
          title: 'Jennifer Smith',
          description: 'Engineering, Scaling Teams • 15 years experience',
          image: null,
          location: 'San Francisco, CA',
          rate: 250,
          link: '/mentors/fallback-1'
        },
        {
          id: 'fallback-2',
          type: 'mentor',
          title: 'Mark Thompson',
          description: 'B2B SaaS, Fundraising • 12 years experience',
          image: null,
          location: 'New York, NY',
          rate: 300,
          link: '/mentors/fallback-2'
        }
      ]
    }
    
    return recommendations
  } catch (error) {
    console.error('Error fetching startup recommendations:', error)
    return []
  }
}

// Fetch mentor-specific recommendations
const fetchMentorRecommendations = async (user, mentorData) => {
  try {
    const { data: startups, error } = await supabase
      .from('startup_profiles')
      .select(`
        id,
        user_id,
        company_name,
        industry,
        stage,
        description,
        slug,
        profiles(
          id,
          full_name,
          avatar_url,
          location
        )
      `)
      .limit(5)

    if (error) throw error

    return startups?.map(startup => ({
      id: startup.id,
      type: 'startup',
      title: startup.company_name,
      description: `${startup.industry || 'Startup'} • ${startup.stage || 'Early'} stage`,
      image: startup.profiles.avatar_url,
      location: startup.profiles.location,
      stage: startup.stage,
      link: `/startups/${startup.slug}`
    })) || []
  } catch (error) {
    console.error('Error fetching mentor recommendations:', error)
    return []
  }
}

// Fetch investor-specific recommendations
const fetchInvestorRecommendations = async (user, investorData) => {
  try {
    const { data: startups, error } = await supabase
      .from('startup_profiles')
      .select(`
        id,
        user_id,
        company_name,
        industry,
        stage,
        funding_goal,
        description,
        slug,
        profiles(
          id,
          full_name,
          avatar_url,
          location
        )
      `)
      .in('stage', ['idea', 'prototype', 'mvp'])
      .limit(5)

    if (error) throw error

    return startups?.map(startup => ({
      id: startup.id,
      type: 'startup',
      title: startup.company_name,
      description: `${startup.industry || 'Startup'} • Seeking $${startup.funding_goal?.toLocaleString() || 'TBD'}`,
      image: startup.profiles.avatar_url,
      location: startup.profiles.location,
      fundingGoal: startup.funding_goal,
      link: `/startups/${startup.slug}`
    })) || []
  } catch (error) {
    console.error('Error fetching investor recommendations:', error)
    return []
  }
}

// Fetch registered events with error handling
const fetchRegisteredEvents = async (user, profile) => {
  try {
    const events = await getUserEventRegistrations(user.id, { upcoming: true })
    return events || []
  } catch (error) {
    console.error('Error fetching registered events:', error)
    return []
  }
}

// Fetch conversations (placeholder)
const fetchConversations = async (user, profile) => {
  // Implementation would depend on messaging system
  return []
}

// Default stats for each user type
const getDefaultStats = (userType) => {
  switch (userType) {
    case 'startup':
      return {
        connections: 0,
        mentorshipRequests: 0,
        investmentRequests: 0,
        fundingRaised: 0
      }
    case 'mentor':
      return {
        connections: 0,
        mentorshipRequests: 0,
        activeMentorships: 0,
        totalMentees: 0
      }
    case 'investor':
      return {
        connections: 0,
        investmentRequests: 0,
        activeInvestments: 0,
        totalInvested: 0
      }
    default:
      return {}
  }
}

// Progressive loading hook for dashboards
export const useDashboardData = (user, profile) => {
  const [essentialData, setEssentialData] = useState(null)
  const [secondaryData, setSecondaryData] = useState(null)
  const [tertiaryData, setTertiaryData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profile) return

    const loadData = async () => {
      // Load essential data first
      const essential = await fetchEssentialData(user, profile)
      setEssentialData(essential)
      setLoading(false)

      // Load secondary data
      const secondary = await fetchSecondaryData(user, profile)
      setSecondaryData(secondary)

      // Load tertiary data last
      const tertiary = await fetchTertiaryData(user, profile)
      setTertiaryData(tertiary)
    }

    loadData()
  }, [user?.id, profile?.id])

  return {
    essentialData,
    secondaryData,
    tertiaryData,
    loading
  }
}