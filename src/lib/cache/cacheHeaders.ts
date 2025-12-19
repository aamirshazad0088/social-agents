/**
 * Cache Headers Utility
 * Provides consistent caching headers for API routes
 * 
 * Cache Strategies:
 * - NONE: No caching (mutations, sensitive data)
 * - SHORT: 1 minute (frequently changing data)
 * - MEDIUM: 5 minutes (semi-static data)
 * - LONG: 1 hour (rarely changing data)
 * - STATIC: 1 day (static content)
 */

export type CacheStrategy = 'none' | 'short' | 'medium' | 'long' | 'static' | 'private-short' | 'private-medium'

interface CacheConfig {
  maxAge: number          // Browser cache duration in seconds
  sMaxAge: number         // CDN/Edge cache duration in seconds
  staleWhileRevalidate: number  // Stale-while-revalidate duration
  isPrivate: boolean      // Whether cache is private (user-specific)
}

const CACHE_CONFIGS: Record<CacheStrategy, CacheConfig> = {
  // No caching - for mutations and sensitive data
  none: {
    maxAge: 0,
    sMaxAge: 0,
    staleWhileRevalidate: 0,
    isPrivate: true,
  },
  
  // Short cache - 1 minute (posts list, notifications)
  short: {
    maxAge: 60,
    sMaxAge: 60,
    staleWhileRevalidate: 120,
    isPrivate: false,
  },
  
  // Medium cache - 5 minutes (analytics, activity logs)
  medium: {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 600,
    isPrivate: false,
  },
  
  // Long cache - 1 hour (workspace settings, user profiles)
  long: {
    maxAge: 3600,
    sMaxAge: 3600,
    staleWhileRevalidate: 7200,
    isPrivate: false,
  },
  
  // Static cache - 1 day (rarely changing content)
  static: {
    maxAge: 86400,
    sMaxAge: 86400,
    staleWhileRevalidate: 172800,
    isPrivate: false,
  },
  
  // Private short - 1 minute, user-specific data
  'private-short': {
    maxAge: 60,
    sMaxAge: 0,
    staleWhileRevalidate: 120,
    isPrivate: true,
  },
  
  // Private medium - 5 minutes, user-specific data
  'private-medium': {
    maxAge: 300,
    sMaxAge: 0,
    staleWhileRevalidate: 600,
    isPrivate: true,
  },
}

/**
 * Generate Cache-Control header value
 */
export function getCacheControlHeader(strategy: CacheStrategy): string {
  const config = CACHE_CONFIGS[strategy]
  
  if (strategy === 'none') {
    return 'no-store, no-cache, must-revalidate, proxy-revalidate'
  }
  
  const parts: string[] = []
  
  if (config.isPrivate) {
    parts.push('private')
  } else {
    parts.push('public')
  }
  
  parts.push(`max-age=${config.maxAge}`)
  
  if (!config.isPrivate && config.sMaxAge > 0) {
    parts.push(`s-maxage=${config.sMaxAge}`)
  }
  
  if (config.staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`)
  }
  
  return parts.join(', ')
}

/**
 * Get cache headers object for NextResponse
 */
export function getCacheHeaders(strategy: CacheStrategy): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': getCacheControlHeader(strategy),
  }
  
  // Add Vary header for proper cache key differentiation
  if (strategy !== 'none') {
    headers['Vary'] = 'Authorization, Accept-Encoding'
  }
  
  // Add CDN-Cache-Control for edge caching (Vercel, Cloudflare)
  if (!CACHE_CONFIGS[strategy].isPrivate && strategy !== 'none') {
    headers['CDN-Cache-Control'] = getCacheControlHeader(strategy)
    headers['Vercel-CDN-Cache-Control'] = getCacheControlHeader(strategy)
  }
  
  return headers
}

/**
 * Apply cache headers to a Response or NextResponse
 */
export function applyCacheHeaders<T extends Response>(
  response: T,
  strategy: CacheStrategy
): T {
  const headers = getCacheHeaders(strategy)
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse<T>(
  data: T,
  strategy: CacheStrategy,
  status: number = 200
): Response {
  const headers = getCacheHeaders(strategy)
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Recommended cache strategies by route type
 */
export const ROUTE_CACHE_STRATEGIES = {
  // Read operations
  'GET /api/posts': 'private-short',
  'GET /api/workspace': 'private-medium',
  'GET /api/workspace/activity': 'private-short',
  'GET /api/workspace/members': 'private-medium',
  'GET /api/credentials/status': 'private-short',
  'GET /api/analytics': 'private-medium',
  
  // Write operations (no cache)
  'POST /api/posts': 'none',
  'PUT /api/posts': 'none',
  'DELETE /api/posts': 'none',
  'POST /api/auth': 'none',
  
  // Static content
  'GET /api/settings': 'long',
} as const

/**
 * ETag generation for conditional requests
 */
export function generateETag(data: unknown): string {
  const content = JSON.stringify(data)
  // Simple hash for ETag (in production, use a proper hash)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`
}

/**
 * Check if client has valid cached version
 */
export function isNotModified(
  request: Request,
  etag: string,
  lastModified?: Date
): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match')
  const ifModifiedSince = request.headers.get('If-Modified-Since')
  
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true
  }
  
  if (ifModifiedSince && lastModified) {
    const clientDate = new Date(ifModifiedSince)
    return lastModified <= clientDate
  }
  
  return false
}

/**
 * Create a 304 Not Modified response
 */
export function notModifiedResponse(etag?: string): Response {
  const headers: Record<string, string> = {}
  if (etag) {
    headers['ETag'] = etag
  }
  
  return new Response(null, {
    status: 304,
    headers,
  })
}
