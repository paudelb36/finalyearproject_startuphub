'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  const createRoleSpecificProfile = async (userId, role, userData) => {
    try {
      console.log('Creating role-specific profile for:', { userId, role, userData })
      switch (role) {
        case 'startup':
          const startupData = {
            user_id: userId,
            company_name: userData.companyName || 'New Startup',
            slug: `startup-${userId.slice(0, 8)}`,
            stage: 'idea',
            industry: userData.industry || null,
            location: userData.location || null
          }
          console.log('Inserting startup profile data:', startupData)
          const { error: startupError } = await supabase
            .from('startup_profiles')
            .insert(startupData)
          if (startupError) {
            console.error('Error creating startup profile:', startupError)
          } else {
            console.log('Startup profile created successfully')
          }
          break

        case 'mentor':
          const { error: mentorError } = await supabase
            .from('mentor_profiles')
            .insert({
              user_id: userId,
              expertise_tags: userData.expertise ? [userData.expertise] : [],
              years_experience: userData.experience || 0,
              availability: 'available',
              is_paid: false,
              company: userData.company || null,
              job_title: userData.jobTitle || null
            })
          if (mentorError) console.error('Error creating mentor profile:', mentorError)
          break

        case 'investor':
          const { error: investorError } = await supabase
            .from('investor_profiles')
            .insert({
              user_id: userId,
              investment_stage: userData.investmentStage ? [userData.investmentStage] : [],
              sectors: userData.sectors ? [userData.sectors] : [],
              geographic_focus: userData.geographicFocus ? [userData.geographicFocus] : [],
              fund_name: userData.fundName || null,
              ticket_size_min: userData.ticketSizeMin || null,
              ticket_size_max: userData.ticketSizeMax || null
            })
          if (investorError) console.error('Error creating investor profile:', investorError)
          break

        default:
          console.log('No role-specific profile needed for role:', role)
      }
    } catch (error) {
      console.error('Error in createRoleSpecificProfile:', error)
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      console.log('SignUp called with userData:', userData)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) throw error
      console.log('Auth signup successful, user created:', data.user?.id)

      // Create profile entry if user was created successfully
      if (data.user && !error) {
        console.log('Creating basic profile...')
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: userData.fullName,
            role: userData.role
          })
        
        if (profileError) {
          console.error('Error creating profile:', profileError)
        } else {
          console.log('Basic profile created successfully, now creating role-specific profile...')
          // Create role-specific profile entry
          await createRoleSpecificProfile(data.user.id, userData.role, userData)
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      router.push('/auth/signin')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return { data, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider