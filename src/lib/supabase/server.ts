/**
 * Supabase Server Client
 * Use this client in server components, API routes, and server actions
 * NOTE: This module uses server-only imports (next/headers)
 * It should only be imported from API routes and server actions
 * 
 * OPTIMIZATION: Uses request-scoped caching via AsyncLocalStorage to avoid
 * recreating Supabase clients on every database operation (~10-50ms savings per call)
 */

import { AsyncLocalStorage } from 'async_hooks'
import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

// Request-scoped client cache using AsyncLocalStorage
// This ensures each request gets its own client instance, but reuses it within the request
const clientStorage = new AsyncLocalStorage<Map<string, SupabaseClient<Database>>>()

/**
 * Create a server-side Supabase client
 * Only call this from API routes, server actions, or server components
 * 
 * OPTIMIZATION: Caches client per request lifecycle using AsyncLocalStorage
 * Multiple calls within the same request will return the same client instance
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  // Check for cached client in current request context
  const store = clientStorage.getStore()
  const cacheKey = 'anon' // Key for anon client

  if (store?.has(cacheKey)) {
    return store.get(cacheKey)!
  }

  let cookieStore
  try {
    cookieStore = await cookies()
  } catch (error) {
    // During build time, cookies() might not be available
    // Return a client without cookie handling for build-time operations
    return createSupabaseServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get() { return undefined },
          set() { },
          remove() { },
        },
      }
    )
  }

  const client = createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie errors (happens in Server Components)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie errors
          }
        },
      },
    }
  )

  // Validate the client has the expected methods
  if (!client.from || typeof client.from !== 'function') {
    throw new Error('Supabase client initialization failed')
  }

  // Cache the client for this request
  if (store) {
    store.set(cacheKey, client)
  }

  return client
}

/**
 * Run a function within a request-scoped context
 * This enables Supabase client caching for all operations within the callback
 * 
 * Usage in API routes:
 * ```
 * export async function GET(request: Request) {
 *   return withRequestContext(async () => {
 *     // All Supabase operations here will share the same client
 *     const supabase = await createClient()
 *     // ...
 *   })
 * }
 * ```
 */
export function withRequestContext<T>(fn: () => Promise<T>): Promise<T> {
  const store = new Map<string, SupabaseClient<Database>>()
  return clientStorage.run(store, fn)
}

// Alias to match existing imports in API routes
export { createClient as createServerClient }

/**
 * Create a Supabase Admin client using service role key
 * This bypasses RLS and should only be used for:
 * - Cron jobs / scheduled tasks
 * - Background processing without user session
 * - Admin operations
 * 
 * WARNING: This client has full database access - use carefully!
 */
let adminClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

export async function createAdminClient() {
  // Return cached instance if available (safe for serverless - stateless)
  if (adminClientInstance) return adminClientInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  adminClientInstance = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminClientInstance
}
