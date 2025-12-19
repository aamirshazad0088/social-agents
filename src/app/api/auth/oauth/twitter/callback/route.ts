/**
 * Twitter OAuth Callback
 * GET /api/auth/oauth/twitter/callback?code=xxx&state=xxx
 *
 * Handles OAuth callback from Twitter
 * - Verifies CSRF state
 * - Exchanges code for token using PKCE
 * - Saves credentials securely
 * - NEVER stores API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyOAuthState } from '@/services/database/oauthStateService'
import { CredentialService } from '@/services/database/credentialService'
import { logAuditEvent } from '@/services/database/auditLogService'
import { verifyPKCECode } from '@/services/database/oauthStateService'

/**
 * Helper function to redirect with error
 * Errors are logged but not exposed in URL
 */
function createErrorRedirect(baseUrl: string): string {
  const url = new URL(baseUrl)
  url.pathname = '/settings'
  url.searchParams.set('tab', 'accounts')
  return url.toString()
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')


  try {
    // ✅ Step 1: Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const response = NextResponse.redirect(
        new URL('/login?error=oauth_unauthorized', req.nextUrl.origin)
      )
      return response
    }

    // ✅ Step 2: Get workspace and verify admin role using RPC to avoid RLS recursion
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    
    if (rpcError || !rpcData) {
      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
      return response
    }

    const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const workspaceId = profileData?.workspace_id
    const userRole = profileData?.role || 'admin'

    if (!workspaceId) {
      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
      return response
    }
    

    // Check if user is admin (required for OAuth connections)
    if (userRole !== 'admin') {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_callback_unauthorized',
        status: 'failed',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=insufficient_permissions', req.nextUrl.origin)
      )
      return response
    }

    // ✅ Step 3: Check for OAuth denial from Twitter
    if (error) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_user_denied',
        status: 'failed',
        errorCode: error,
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=user_denied', req.nextUrl.origin)
      )
      return response
    }

    // ✅ Step 4: Validate required parameters
    if (!code || !state) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_missing_params',
        status: 'failed',
        errorCode: 'MISSING_PARAMS',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=missing_params', req.nextUrl.origin)
      )
      return response
    }

    // ✅ Step 5: Verify CSRF state (prevents replay attacks)
    
    const stateVerification = await verifyOAuthState(workspaceId, 'twitter', state)
    

    if (!stateVerification.valid) {
      
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_csrf_check_failed',
        status: 'failed',
        errorMessage: stateVerification.error,
        errorCode: 'CSRF_FAILED',
        metadata: {
          statePrefix: state?.substring(0, 20),
          workspaceId,
        },
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=csrf_check_failed', req.nextUrl.origin)
      )
      return response
    }
    

    // ✅ Step 6: Get PKCE verifier from secure cookie
    const codeVerifier = req.cookies.get('oauth_twitter_verifier')?.value

    if (!codeVerifier) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_missing_verifier',
        status: 'failed',
        errorCode: 'MISSING_VERIFIER',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=missing_verifier', req.nextUrl.origin)
      )
      response.cookies.delete('oauth_twitter_verifier')
      return response
    }

    // ✅ Step 7: Exchange code for token using direct HTTP call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const callbackUrl = `${baseUrl}/api/auth/oauth/twitter/callback`

    let tokenData: any
    try {

      const clientId = process.env.TWITTER_CLIENT_ID

      if (!clientId) {
        throw new Error('Twitter Client ID not configured')
      }

      // Make direct HTTP call to X API OAuth2 token endpoint (correct endpoint)
      const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: callbackUrl,
          client_id: clientId,
          code_verifier: codeVerifier!,
        }).toString(),
      })


      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errorText}`)
      }

      tokenData = await tokenResponse.json()
    } catch (exchangeError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_token_exchange_failed',
        status: 'failed',
        errorMessage: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
        errorCode: 'TOKEN_EXCHANGE_FAILED',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=token_exchange_failed', req.nextUrl.origin)
      )
      response.cookies.delete('oauth_twitter_verifier')
      return response
    }

    // ✅ Step 8: Get user info to verify credentials
    let twitterUser: any
    try {
      const accessToken = tokenData.access_token

      if (!accessToken) {
        throw new Error(`No access token in token response. Keys: ${Object.keys(tokenData).join(', ')}`)
      }


      // Create authenticated client with the bearer token
      const { TwitterApi } = await import('twitter-api-v2')
      const userClient = new TwitterApi(accessToken)
      const userMe = userClient.readOnly.v2
      twitterUser = await userMe.me()
    } catch (userError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_get_user_failed',
        status: 'failed',
        errorMessage: userError instanceof Error ? userError.message : String(userError),
        errorCode: 'GET_USER_FAILED',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=get_user_failed', req.nextUrl.origin)
      )
      response.cookies.delete('oauth_twitter_verifier')
      return response
    }

    // ✅ Step 9: Build credentials object
    // IMPORTANT: DO NOT store API keys here!
    // Only store user-specific tokens
    const credentials: any = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      username: twitterUser.data?.username,
      userId: twitterUser.data?.id,
      isConnected: true,
      connectedAt: new Date().toISOString(),
    }

    // Twitter OAuth2 tokens typically expire in 2 hours (7200 seconds)
    if (tokenData.expires_in) {
      credentials.expiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      ).toISOString()
    }


    // ✅ Step 10: Save credentials to database (encrypted)
    try {
      await CredentialService.savePlatformCredentials(
        'twitter',
        credentials,
        user.id,
        workspaceId
      )
    } catch (saveError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'twitter',
        action: 'oauth_save_credentials_failed',
        status: 'failed',
        errorMessage: saveError instanceof Error ? saveError.message : String(saveError),
        errorCode: 'SAVE_CREDENTIALS_FAILED',
        ipAddress: ipAddress || undefined,
      })

      const response = NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=save_failed', req.nextUrl.origin)
      )
      response.cookies.delete('oauth_twitter_verifier')
      return response
    }

    // ✅ Step 11: Success - redirect to dashboard
    const response = NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_success=twitter', req.nextUrl.origin)
    )

    // Clear the OAuth verifier cookie
    response.cookies.delete('oauth_twitter_verifier')

    // Log success
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'twitter',
      action: 'platform_connected',
      status: 'success',
      ipAddress: ipAddress || undefined,
    })

    return response
  } catch (error) {

    // Try to log the error
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Use RPC to get workspace_id to avoid RLS recursion
        const { data: rpcData } = await supabase.rpc('get_my_profile')
        const profileData: any = rpcData ? (Array.isArray(rpcData) ? rpcData[0] : rpcData) : null
        
        if (profileData?.workspace_id) {
          await logAuditEvent({
            workspaceId: profileData.workspace_id,
            userId: user.id,
            platform: 'twitter',
            action: 'oauth_callback_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'CALLBACK_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
    }

    const response = NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_error=callback_error', req.nextUrl.origin)
    )
    response.cookies.delete('oauth_twitter_verifier')
    return response
  }
}
