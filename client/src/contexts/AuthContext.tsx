import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  session: Session | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    // Initialize token from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize authentication state
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      
      if (session?.access_token) {
        // Store the JWT token
        setToken(session.access_token)
        localStorage.setItem('auth_token', session.access_token)
        await fetchUserProfile()
      } else {
        // Clear token and user data
        setToken(null)
        setUser(null)
        localStorage.removeItem('auth_token')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const initializeAuth = async () => {
    try {
      // Check if we have a stored token
      const storedToken = localStorage.getItem('auth_token')
      
      if (storedToken) {
        setToken(storedToken)
        // Try to get current session from Supabase
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setSession(session)
          setSupabaseUser(session.user)
          // Update token if it's different
          if (session.access_token !== storedToken) {
            setToken(session.access_token)
            localStorage.setItem('auth_token', session.access_token)
          }
        }
        
        // Fetch user profile with the token
        await fetchUserProfile()
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      // Clear invalid token
      setToken(null)
      localStorage.removeItem('auth_token')
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const currentToken = token || localStorage.getItem('auth_token')
      
      if (!currentToken) {
        setLoading(false)
        return
      }

      // Call our serverless API with JWT token
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if (response.status === 401) {
        // Token is invalid, clear it
        setToken(null)
        setUser(null)
        localStorage.removeItem('auth_token')
        await supabase.auth.signOut()
      } else {
        console.error('Failed to fetch user profile:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Call our serverless login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          // Handle both Supabase auth and fallback auth
          if (data.session?.access_token) {
            // Supabase authentication
            setToken(data.session.access_token)
            localStorage.setItem('auth_token', data.session.access_token)
            setSession(data.session)
            setSupabaseUser(data.user)
          } else if (data.fallback) {
            // Fallback authentication (hardcoded credentials)
            setToken(data.session.access_token)
            localStorage.setItem('auth_token', data.session.access_token)
            setSupabaseUser(data.user)
          }
          
          // Fetch user profile
          await fetchUserProfile()
          return {}
        } else {
          return { error: data.message || 'Login failed' }
        }
      } else {
        const errorData = await response.json()
        return { error: errorData.message || 'Invalid credentials' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { error: 'Login failed' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const currentToken = token || localStorage.getItem('auth_token')
      
      // Call our serverless logout endpoint
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        })
      }
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear all state
      setUser(null)
      setSupabaseUser(null)
      setSession(null)
      setToken(null)
      localStorage.removeItem('auth_token')
    } catch (error) {
      console.error('Error signing out:', error)
      // Clear state even if API calls fail
      setUser(null)
      setSupabaseUser(null)
      setSession(null)
      setToken(null)
      localStorage.removeItem('auth_token')
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    try {
      // Call our serverless registration endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          // Handle successful registration
          if (data.session?.access_token) {
            setToken(data.session.access_token)
            localStorage.setItem('auth_token', data.session.access_token)
            setSession(data.session)
            setSupabaseUser(data.user)
            await fetchUserProfile()
          }
          return {}
        } else {
          return { error: data.message || 'Registration failed' }
        }
      } else {
        const errorData = await response.json()
        return { error: errorData.message || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { error: 'Registration failed' }
    }
  }

  const value = {
    user,
    supabaseUser,
    session,
    token,
    loading,
    signIn,
    signOut,
    signUp,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}