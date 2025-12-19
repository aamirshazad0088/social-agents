/**
 * Meta API Utilities
 * Shared utilities for Meta Graph API calls
 */

import crypto from 'crypto'

const META_API_VERSION = 'v24.0'
export const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * Generate appsecret_proof for Meta API calls
 * This is required for server-side API calls to prove the request comes from a server with the app secret
 * 
 * @see https://developers.facebook.com/docs/graph-api/securing-requests
 */
export function generateAppSecretProof(accessToken: string): string {
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET
  if (!appSecret) {
    return ''
  }
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

/**
 * Build URL with access token and appsecret_proof
 */
export function buildMetaApiUrl(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): string {
  const appSecretProof = generateAppSecretProof(accessToken)
  
  const url = new URL(`${META_API_BASE}${endpoint}`)
  url.searchParams.set('access_token', accessToken)
  
  if (appSecretProof) {
    url.searchParams.set('appsecret_proof', appSecretProof)
  }
  
  // Add additional params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  
  return url.toString()
}

/**
 * Make a GET request to Meta Graph API with proper authentication
 */
export async function metaApiGet<T = any>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<{ data: T | null; error: any | null }> {
  try {
    const url = buildMetaApiUrl(endpoint, accessToken, params)
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return { data: null, error }
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Make a POST request to Meta Graph API with proper authentication
 */
export async function metaApiPost<T = any>(
  endpoint: string,
  accessToken: string,
  body: Record<string, any> = {},
  params: Record<string, string> = {}
): Promise<{ data: T | null; error: any | null }> {
  try {
    const appSecretProof = generateAppSecretProof(accessToken)
    const url = new URL(`${META_API_BASE}${endpoint}`)
    
    // Add params to URL
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    
    // Add auth to body
    const requestBody = {
      ...body,
      access_token: accessToken,
      ...(appSecretProof && { appsecret_proof: appSecretProof }),
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return { data: null, error }
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Make a DELETE request to Meta Graph API with proper authentication
 */
export async function metaApiDelete<T = any>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<{ data: T | null; error: any | null }> {
  try {
    const url = buildMetaApiUrl(endpoint, accessToken, params)
    const response = await fetch(url, { method: 'DELETE' })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return { data: null, error }
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}
