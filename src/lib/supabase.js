import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Server-side Supabase client for API routes and server components
export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Admin/Service role client for server-side operations that need elevated permissions
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to get user session on server
export async function getServerSession() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return { session: null, error }
    }
    
    return { session, error: null }
  } catch (error) {
    console.error('Error in getServerSession:', error)
    return { session: null, error }
  }
}

// Helper function to get user profile on server
export async function getServerUserProfile(userId) {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error getting user profile:', error)
      return { profile: null, error }
    }
    
    return { profile, error: null }
  } catch (error) {
    console.error('Error in getServerUserProfile:', error)
    return { profile: null, error }
  }
}

// Helper function to require authentication on server
export async function requireServerAuth(allowedRoles = []) {
  const { session, error: sessionError } = await getServerSession()
  
  if (sessionError || !session) {
    return {
      user: null,
      profile: null,
      error: 'Authentication required',
      redirect: '/auth/signin'
    }
  }
  
  const { profile, error: profileError } = await getServerUserProfile(session.user.id)
  
  if (profileError || !profile) {
    return {
      user: session.user,
      profile: null,
      error: 'Profile not found',
      redirect: '/onboarding'
    }
  }
  
  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    return {
      user: session.user,
      profile,
      error: 'Insufficient permissions',
      redirect: '/dashboard'
    }
  }
  
  // Check if user account is active
  if (profile.status !== 'active') {
    return {
      user: session.user,
      profile,
      error: 'Account is not active',
      redirect: '/account-suspended'
    }
  }
  
  return {
    user: session.user,
    profile,
    error: null,
    redirect: null
  }
}

// Helper function to get role-specific profile
export async function getRoleProfile(userId, role) {
  const supabase = await createServerSupabaseClient()
  
  let tableName
  switch (role) {
    case 'startup':
      tableName = 'startup_profiles'
      break
    case 'mentor':
      tableName = 'mentor_profiles'
      break
    case 'investor':
      tableName = 'investor_profiles'
      break
    default:
      return { profile: null, error: 'Invalid role' }
  }
  
  try {
    const { data: profile, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { profile, error }
  } catch (error) {
    console.error(`Error getting ${role} profile:`, error)
    return { profile: null, error }
  }
}

// Helper function for file uploads
export async function uploadFile(bucket, path, file, options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    return { data: { ...data, publicUrl }, error: null }
  } catch (error) {
    console.error('Error uploading file:', error)
    return { data: null, error }
  }
}

// Helper function to delete file
export async function deleteFile(bucket, path) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    return { data, error }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { data: null, error }
  }
}

// Helper function to get file URL
export function getFileUrl(bucket, path) {
  if (!path) return null
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

// Helper function to create signed URL for private files
export async function createSignedUrl(bucket, path, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    
    return { data, error }
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return { data: null, error }
  }
}

// Database helper functions
export const db = {
  // Generic select with filters
  async select(table, columns = '*', filters = {}) {
    let query = supabase.from(table).select(columns)
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })
    
    return await query
  },
  
  // Generic insert
  async insert(table, data) {
    return await supabase.from(table).insert(data).select()
  },
  
  // Generic update
  async update(table, data, filters = {}) {
    let query = supabase.from(table).update(data)
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    return await query.select()
  },
  
  // Generic delete
  async delete(table, filters = {}) {
    let query = supabase.from(table).delete()
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    return await query
  }
}

// Real-time subscription helpers
export function subscribeToTable(table, callback, filters = {}) {
  let subscription = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: table,
      ...filters
    }, callback)
    .subscribe()
  
  return subscription
}

export function subscribeToUserData(userId, callback) {
  return supabase
    .channel(`user_${userId}_data`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${userId}`
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'connections',
      filter: `target_id=eq.${userId}`
    }, callback)
    .subscribe()
}

// Utility functions
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(new Date(date))
}

export function timeAgo(date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
  return `${Math.floor(diffInSeconds / 31536000)}y ago`
}

// Error handling
export function handleSupabaseError(error) {
  console.error('Supabase error:', error)
  
  if (error.code === 'PGRST116') {
    return 'No data found'
  }
  
  if (error.code === '23505') {
    return 'This item already exists'
  }
  
  if (error.code === '42501') {
    return 'You do not have permission to perform this action'
  }
  
  return error.message || 'An unexpected error occurred'
}

export default supabase