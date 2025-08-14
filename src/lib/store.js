import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from './supabase'

// Cache configuration
const STALE_TIME = 5 * 60 * 1000 // 5 minutes in milliseconds

// Helper function to check if data is stale
const isStale = (timestamp) => {
  return Date.now() - timestamp > STALE_TIME
}

// Helper function to create cache entry
const createCacheEntry = (data) => ({
  data,
  timestamp: Date.now(),
  loading: false,
  error: null
})

// Helper function to create loading entry
const createLoadingEntry = () => ({
  data: null,
  timestamp: Date.now(),
  loading: true,
  error: null
})

// Helper function to create error entry
const createErrorEntry = (error) => ({
  data: null,
  timestamp: Date.now(),
  loading: false,
  error
})

export const useStore = create(
  persist(
    (set, get) => ({
  // Cache storage
  cache: {
    profiles: {},
    startups: {},
    mentors: {},
    investors: {},
    events: {},
    recommendations: {},
    connections: {},
    requests: {},
    updates: {},
    teamMembers: {}
  },

  // Generic cache getter
  getCacheEntry: (type, key) => {
    const state = get()
    return state.cache[type]?.[key]
  },

  // Generic cache setter
  setCacheEntry: (type, key, entry) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [type]: {
          ...state.cache[type],
          [key]: entry
        }
      }
    }))
  },

  // Clear specific cache type
  clearCache: (type, key = null) => {
    set((state) => {
      if (key) {
        const newCache = { ...state.cache[type] }
        delete newCache[key]
        return {
          cache: {
            ...state.cache,
            [type]: newCache
          }
        }
      } else {
        return {
          cache: {
            ...state.cache,
            [type]: {}
          }
        }
      }
    })
  },

  // Profile operations
  getProfile: async (userId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('profiles', userId)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      // Wait for ongoing request
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('profiles', userId)
          if (!current?.loading) {
            resolve(current?.data || null)
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('profiles', userId, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setCacheEntry('profiles', userId, createCacheEntry(data))
      return data
    } catch (error) {
      console.error('Store getProfile error details:', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
        statusCode: error?.statusCode,
        userId,
        errorString: String(error),
        errorKeys: Object.keys(error || {})
      })
      
      // Try to stringify the full error
      try {
        console.error('Full error object:', JSON.stringify(error, null, 2))
      } catch (stringifyError) {
        console.error('Error stringifying error:', stringifyError.message)
        console.error('Raw error:', error)
      }
      
      setCacheEntry('profiles', userId, createErrorEntry(error))
      throw error
    }
  },

  // Startup operations
  getStartups: async (filters = {}, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cacheKey = JSON.stringify(filters)
    const cached = getCacheEntry('startups', cacheKey)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('startups', cacheKey)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('startups', cacheKey, createLoadingEntry())

    try {
      let query = supabase
        .from('startup_profiles')
        .select(`
          *,
          profile:profiles!startup_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,tagline.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.industry) {
        query = query.eq('industry', filters.industry)
      }
      if (filters.stage) {
        query = query.eq('stage', filters.stage)
      }

      const { data, error } = await query

      if (error) throw error

      setCacheEntry('startups', cacheKey, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('startups', cacheKey, createErrorEntry(error))
      throw error
    }
  },

  // Get single startup by slug
  getStartupBySlug: async (slug, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('startups', `slug_${slug}`)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('startups', `slug_${slug}`)
          if (!current?.loading) {
            resolve(current?.data || null)
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('startups', `slug_${slug}`, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('startup_profiles')
        .select(`
          *,
          profile:profiles!startup_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .eq('slug', slug)
        .single()

      if (error) throw error

      setCacheEntry('startups', `slug_${slug}`, createCacheEntry(data))
      return data
    } catch (error) {
      setCacheEntry('startups', `slug_${slug}`, createErrorEntry(error))
      throw error
    }
  },

  // Get startup by user ID
  getStartupByUserId: async (userId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('startups', `user_${userId}`)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('startups', `user_${userId}`)
          if (!current?.loading) {
            resolve(current?.data || null)
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('startups', `user_${userId}`, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('startup_profiles')
        .select(`
          *,
          profile:profiles!startup_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          setCacheEntry('startups', `user_${userId}`, createCacheEntry(null))
          return null
        }
        throw error
      }

      setCacheEntry('startups', `user_${userId}`, createCacheEntry(data))
      return data
    } catch (error) {
      setCacheEntry('startups', `user_${userId}`, createErrorEntry(error))
      throw error
    }
  },

  // Mentors operations
  getMentors: async (filters = {}, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cacheKey = JSON.stringify(filters)
    const cached = getCacheEntry('mentors', cacheKey)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('mentors', cacheKey)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('mentors', cacheKey, createLoadingEntry())

    try {
      let query = supabase
        .from('mentor_profiles')
        .select(`
          *,
          profile:profiles!mentor_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.search) {
        query = query.or(`expertise_tags.cs.{"${filters.search}"},bio.ilike.%${filters.search}%`)
      }
      if (filters.expertise) {
        query = query.contains('expertise_tags', [filters.expertise])
      }
      if (filters.experience) {
        query = query.eq('years_experience', filters.experience)
      }

      const { data, error } = await query

      if (error) throw error

      setCacheEntry('mentors', cacheKey, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('mentors', cacheKey, createErrorEntry(error))
      throw error
    }
  },

  // Get single mentor by ID
  getMentorById: async (mentorId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('mentors', `id_${mentorId}`)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('mentors', `id_${mentorId}`)
          if (!current?.loading) {
            resolve(current?.data || null)
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('mentors', `id_${mentorId}`, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select(`
          *,
          profile:profiles!mentor_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .eq('user_id', mentorId)
        .single()

      if (error) throw error

      setCacheEntry('mentors', `id_${mentorId}`, createCacheEntry(data))
      return data
    } catch (error) {
      setCacheEntry('mentors', `id_${mentorId}`, createErrorEntry(error))
      throw error
    }
  },

  // Investors operations
  getInvestors: async (filters = {}, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cacheKey = JSON.stringify(filters)
    const cached = getCacheEntry('investors', cacheKey)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('investors', cacheKey)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('investors', cacheKey, createLoadingEntry())

    try {
      let query = supabase
        .from('investor_profiles')
        .select(`
          *,
          profile:profiles!investor_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.search) {
        query = query.or(`fund_name.ilike.%${filters.search}%,sectors.cs.{"${filters.search}"}`)
      }
      if (filters.investmentStage) {
        query = query.contains('investment_stage', [filters.investmentStage])
      }
      if (filters.industry) {
        query = query.contains('sectors', [filters.industry])
      }

      const { data, error } = await query

      if (error) throw error

      setCacheEntry('investors', cacheKey, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('investors', cacheKey, createErrorEntry(error))
      throw error
    }
  },

  // Get single investor by ID
  getInvestorById: async (investorId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('investors', `id_${investorId}`)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('investors', `id_${investorId}`)
          if (!current?.loading) {
            resolve(current?.data || null)
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('investors', `id_${investorId}`, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('investor_profiles')
        .select(`
          *,
          profile:profiles!investor_profiles_user_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            location
          )
        `)
        .eq('user_id', investorId)
        .single()

      if (error) throw error

      setCacheEntry('investors', `id_${investorId}`, createCacheEntry(data))
      return data
    } catch (error) {
      setCacheEntry('investors', `id_${investorId}`, createErrorEntry(error))
      throw error
    }
  },

  // Events operations
  getEvents: async (filters = {}, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cacheKey = JSON.stringify(filters)
    const cached = getCacheEntry('events', cacheKey)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('events', cacheKey)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('events', cacheKey, createLoadingEntry())

    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!organizer_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .order('event_date', { ascending: true })

      // Apply filters
      if (filters.type && filters.type !== 'all') {
        query = query.eq('event_type', filters.type)
      }
      if (filters.status && filters.status !== 'all') {
        const now = new Date().toISOString()
        if (filters.status === 'upcoming') {
          query = query.gte('event_date', now)
        } else if (filters.status === 'past') {
          query = query.lt('event_date', now)
        }
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setCacheEntry('events', cacheKey, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('events', cacheKey, createErrorEntry(error))
      throw error
    }
  },

  // Recommendations operations
  getRecommendations: async (userId, topK = 5, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cacheKey = `${userId}_${topK}`
    const cached = getCacheEntry('recommendations', cacheKey)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('recommendations', cacheKey)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('recommendations', cacheKey, createLoadingEntry())

    try {
      const response = await fetch(`/api/recommendations?userId=${userId}&topK=${topK}`)
      if (!response.ok) throw new Error('Failed to fetch recommendations')
      
      const result = await response.json()
      const data = result.data || []

      setCacheEntry('recommendations', cacheKey, createCacheEntry(data))
      return data
    } catch (error) {
      setCacheEntry('recommendations', cacheKey, createErrorEntry(error))
      throw error
    }
  },

  // Team members operations
  getTeamMembers: async (startupId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('teamMembers', startupId)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('teamMembers', startupId)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('teamMembers', startupId, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('startup_id', startupId)
        .order('is_founder', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      setCacheEntry('teamMembers', startupId, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('teamMembers', startupId, createErrorEntry(error))
      throw error
    }
  },

  // Startup updates operations
  getStartupUpdates: async (startupId, forceRefresh = false) => {
    const { getCacheEntry, setCacheEntry } = get()
    const cached = getCacheEntry('updates', startupId)
    
    if (!forceRefresh && cached && !isStale(cached.timestamp) && !cached.loading) {
      return cached.data
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          const current = getCacheEntry('updates', startupId)
          if (!current?.loading) {
            resolve(current?.data || [])
          } else {
            setTimeout(checkLoading, 100)
          }
        }
        checkLoading()
      })
    }

    setCacheEntry('updates', startupId, createLoadingEntry())

    try {
      const { data, error } = await supabase
        .from('startup_updates')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCacheEntry('updates', startupId, createCacheEntry(data || []))
      return data || []
    } catch (error) {
      setCacheEntry('updates', startupId, createErrorEntry(error))
      throw error
    }
  },

  // Invalidate cache when data is updated
  invalidateCache: (type, key = null) => {
    const { clearCache } = get()
    clearCache(type, key)
  },

  // Update cache entry directly (for optimistic updates)
  updateCacheEntry: (type, key, data) => {
    const { setCacheEntry } = get()
    setCacheEntry(type, key, createCacheEntry(data))
  }
    }),
    {
      name: 'startup-platform-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cache: {
          profiles: state.cache.profiles,
          startups: state.cache.startups,
          mentors: state.cache.mentors,
          investors: state.cache.investors,
          events: state.cache.events,
          recommendations: state.cache.recommendations,
          connections: state.cache.connections,
          requests: state.cache.requests,
          updates: state.cache.updates,
          teamMembers: state.cache.teamMembers
        }
      }),
      version: 1
    }
  )
)

// Export hook for loading states
export const useLoadingState = (type, key) => {
  const loading = useStore((state) => {
    if (!key || !type) return false
    return state.cache[type]?.[key]?.loading || false
  })
  const error = useStore((state) => {
    if (!key || !type) return null
    return state.cache[type]?.[key]?.error || null
  })
  const hasData = useStore((state) => {
    if (!key || !type) return false
    return !!state.cache[type]?.[key]?.data
  })
  
  return { loading, error, hasData }
}