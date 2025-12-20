/**
 * Supabase Browser Client
 * Use this client in client-side components (components with "use client")
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Singleton instance - lazy initialized
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During SSG/build time, environment variables might not be available
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Get the Supabase client singleton.
 * Returns null during SSG/build when env vars are unavailable.
 */
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: always create a new client
    return createClient()
  }

  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

// Default export for convenience - lazy getter via Proxy
export const supabase = new Proxy({} as NonNullable<ReturnType<typeof createClient>>, {
  get(_, prop) {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error(
        'Supabase client not available. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
      )
    }
    return (client as any)[prop]
  }
})
