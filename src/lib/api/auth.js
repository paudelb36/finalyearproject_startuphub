import { supabase } from '@/lib/supabase'

/**
 * Server-side authentication helpers
 */

/**
 * Get the current user session on the server
 * @returns {Object|null} User session or null
 */
export async function getServerSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User profile or null
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

/**
 * Create a new user profile
 * @param {Object} profileData - Profile data
 * @returns {Object|null} Created profile or null
 */
export async function createUserProfile(profileData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user profile:', error)
    return null
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object|null} Updated profile or null
 */
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

/**
 * Check if user has required role
 * @param {string} userId - User ID
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {boolean} Whether user has required role
 */
export async function checkUserRole(userId, requiredRoles) {
  try {
    const profile = await getUserProfile(userId)
    if (!profile) return false

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    return roles.includes(profile.role)
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

/**
 * Verify user is authenticated and has required role
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {Object|null} User session and profile or null
 */
export async function requireAuth(requiredRoles = null) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return { error: 'Authentication required', status: 401 }
    }

    const profile = await getUserProfile(session.user.id)
    if (!profile) {
      return { error: 'User profile not found', status: 404 }
    }

    if (requiredRoles) {
      const hasRole = await checkUserRole(session.user.id, requiredRoles)
      if (!hasRole) {
        return { error: 'Insufficient permissions', status: 403 }
      }
    }

    return { user: session.user, profile }
  } catch (error) {
    console.error('Error in requireAuth:', error)
    return { error: 'Authentication error', status: 500 }
  }
}

/**
 * Send notification to user
 * @param {string} userId - User ID
 * @param {Object} notificationData - Notification data
 * @returns {Object|null} Created notification or null
 */
export async function sendNotification(userId, notificationData) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        ...notificationData,
        read: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error sending notification:', error)
    return null
  }
}

/**
 * Create activity log entry
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} metadata - Additional metadata
 * @returns {Object|null} Created activity log or null
 */
export async function logActivity(userId, action, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error logging activity:', error)
    return null
  }
}

/**
 * Rate limiting helper
 * @param {string} key - Rate limit key (e.g., user ID + action)
 * @param {number} limit - Maximum requests
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether request is allowed
 */
const rateLimitStore = new Map()

export function checkRateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [])
  }
  
  const requests = rateLimitStore.get(key)
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart)
  
  if (validRequests.length >= limit) {
    return false
  }
  
  // Add current request
  validRequests.push(now)
  rateLimitStore.set(key, validRequests)
  
  return true
}

/**
 * Validate and sanitize input data
 * @param {Object} data - Input data
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result
 */
export function validateInput(data, schema) {
  const errors = {}
  const sanitized = {}
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`
      continue
    }
    
    // Skip validation if field is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue
    }
    
    // Type validation
    if (rules.type) {
      if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = `${field} must be a valid email`
        continue
      }
      
      if (rules.type === 'string' && typeof value !== 'string') {
        errors[field] = `${field} must be a string`
        continue
      }
      
      if (rules.type === 'number' && typeof value !== 'number') {
        errors[field] = `${field} must be a number`
        continue
      }
    }
    
    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`
      continue
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `${field} must be no more than ${rules.maxLength} characters`
      continue
    }
    
    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      errors[field] = rules.message || `${field} is invalid`
      continue
    }
    
    // Sanitize value
    let sanitizedValue = value
    if (rules.trim && typeof value === 'string') {
      sanitizedValue = value.trim()
    }
    
    sanitized[field] = sanitizedValue
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: sanitized
  }
}