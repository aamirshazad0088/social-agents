'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  workspaceId: string | null
  userRole: 'admin' | 'editor' | 'viewer' | null
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)
  const fetchInProgressRef = React.useRef(false)
  const initialLoadComplete = React.useRef(false)
  // OPTIMIZATION: Request deduplication cache
  const profileCacheRef = React.useRef<Map<string, Promise<any>>>(new Map())

  // Log role changes for debugging
  React.useEffect(() => {
    if (userRole !== null) {
    }
  }, [userRole])

  React.useEffect(() => {
    if (workspaceId !== null) {
    }
  }, [workspaceId])

  // OPTIMIZATION: Fetch user profile with request deduplication and caching
  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<{ workspace_id: string; role: string } | null | undefined> => {
    // Check if we already have a pending request for this user
    const cachedRequest = profileCacheRef.current.get(userId)
    if (cachedRequest) {
      return cachedRequest
    }

    // Prevent concurrent profile fetches to avoid race conditions
    if (fetchInProgressRef.current) {
      return
    }

    fetchInProgressRef.current = true
    const maxRetries = 3

    // Create a promise for this fetch and cache it
    const fetchPromise: Promise<{ workspace_id: string; role: string } | null> = (async (): Promise<{ workspace_id: string; role: string } | null> => {
      try {

        // Try RPC first to avoid users RLS recursion
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
        if (!rpcError && rpcData) {
          const d: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
          if (d && d.workspace_id && d.role) {
            setWorkspaceId(d.workspace_id as string)
            setUserRole(d.role as 'admin' | 'editor' | 'viewer')
            return { workspace_id: d.workspace_id, role: d.role }
          } else {
          }
        } else if (rpcError) {
        }

        // Fallback: direct select (requires non-recursive users RLS policy)
        const { data, error } = await supabase
          .from('users')
          .select('workspace_id, role')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          
          // Retry if we haven't exceeded max retries
          if (retryCount < maxRetries) {
            fetchInProgressRef.current = false
            profileCacheRef.current.delete(userId) // Clear cache before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            return (await fetchUserProfile(userId, retryCount + 1)) ?? null
          }
          
          setWorkspaceId(null)
          setUserRole(null)
          return null
        }

        const workspace = (data as any).workspace_id as string
        const role = (data as any).role as 'admin' | 'editor' | 'viewer'

        if (!workspace || !role) {
          
          // Retry if we haven't exceeded max retries
          if (retryCount < maxRetries) {
            fetchInProgressRef.current = false
            profileCacheRef.current.delete(userId) // Clear cache before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            return (await fetchUserProfile(userId, retryCount + 1)) ?? null
          }
          
          setWorkspaceId(null)
          setUserRole(null)
          return null
        }

        setWorkspaceId(workspace)
        setUserRole(role)
        return { workspace_id: workspace, role }
      } catch (error) {
        const e = error as any
        
        // Retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          fetchInProgressRef.current = false
          profileCacheRef.current.delete(userId) // Clear cache before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
          return (await fetchUserProfile(userId, retryCount + 1)) ?? null
        }
        
        setWorkspaceId(null)
        setUserRole(null)
        return null
      } finally {
        fetchInProgressRef.current = false
        // OPTIMIZATION: Clear cache after 5 minutes to allow fresh fetches
        setTimeout(() => profileCacheRef.current.delete(userId), 5 * 60 * 1000)
      }
    })()

    // Cache the promise
    profileCacheRef.current.set(userId, fetchPromise)
    return fetchPromise
  }
// Initialize session
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()

        if (mounted) {
          if (error) {
            setLoading(false)
            return
          }

          setSession(initialSession)
          setUser(initialSession?.user ?? null)

          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user.id)
          } else {
          }
          // Mark initial load as complete AFTER profile fetch
          initialLoadComplete.current = true
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes (ONLY for sign-in/sign-out events, not initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {

      // Skip if initial load hasn't completed yet (prevents duplicate processing)
      if (!initialLoadComplete.current) {
        return
      }

      if (!mounted) return

      // Only process actual sign-in/sign-out events, not passive session refreshes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setWorkspaceId(null)
        setUserRole(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign up new user
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      // The trigger function will automatically create workspace and user profile
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setWorkspaceId(null)
      setUserRole(null)
    } catch (error) {
    }
  }

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data: { session: refreshedSession } } = await supabase.auth.getSession()
      setSession(refreshedSession)
      setUser(refreshedSession?.user ?? null)

      if (refreshedSession?.user) {
        await fetchUserProfile(refreshedSession.user.id)
      }
    } catch (error) {
    }
  }

  const value = {
    user,
    session,
    loading,
    workspaceId,
    userRole,
    signUp,
    signIn,
    signOut,
    refreshSession,
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

