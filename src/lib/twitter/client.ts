/**
 * X (Twitter) API Client Utility
 * Handles X API v2 client initialization
 * Supports both OAuth 1.0a and OAuth 2.0 PKCE authentication
 */

import { TwitterApi } from 'twitter-api-v2'

/**
 * Create X client with app-level credentials (for OAuth 1.0a flow)
 */
export function createTwitterClient() {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('X API credentials not configured')
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
  })
}

/**
 * Create X client with OAuth 1.0a user access tokens
 * Required for media upload (v1 API)
 */
export function createUserTwitterClient(accessToken: string, accessSecret: string) {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('X API credentials not configured')
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  })
}

/**
 * Create X client using app-level OAuth 1.0a tokens from environment variables
 * Use this when you want to post from a single X account (app owner's account)
 */
export function createAppTwitterClient() {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.ACCESS_TOKEN
  const accessSecret = process.env.ACCESS_TOKEN_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('X OAuth 1.0a credentials not fully configured in environment variables')
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  })
}

/**
 * Create read-only X client with Bearer Token (App-only OAuth 2.0)
 */
export function createBearerTwitterClient() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN

  if (!bearerToken) {
    throw new Error('X Bearer Token not configured')
  }

  return new TwitterApi(bearerToken)
}

/**
 * Create X client with OAuth 2.0 user access token
 * Used for posting tweets with OAuth 2.0 PKCE flow
 * Note: This works for v2 endpoints (tweet, user info)
 * Media upload still requires v1 API with OAuth 1.0a
 */
export function createOAuth2UserClient(accessToken: string) {
  return new TwitterApi(accessToken)
}

/**
 * Refresh OAuth 2.0 access token
 * Returns new access token and refresh token
 */
export async function refreshOAuth2Token(refreshToken: string) {
  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('X OAuth 2.0 credentials not configured')
  }

  const client = new TwitterApi({ clientId, clientSecret })
  const { client: refreshedClient, accessToken, refreshToken: newRefreshToken, expiresIn } = 
    await client.refreshOAuth2Token(refreshToken)

  return {
    client: refreshedClient,
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  }
}
