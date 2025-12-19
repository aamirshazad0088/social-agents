/**
 * X (Twitter) OAuth 1.0a - Handle Callback
 * GET /api/twitter/callback?oauth_token=xxx&oauth_verifier=xxx
 * 
 * Exchanges temporary tokens for permanent access tokens
 * Saves accessToken + accessTokenSecret for full API access
 */

import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function GET(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  
  try {
    // Check authentication
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=unauthorized', req.url))
    }

    // Get workspace_id
    const { data: userRow } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (!userRow) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=no_workspace', req.url))
    }

    // Get OAuth parameters from URL
    const { searchParams } = new URL(req.url)
    const oauth_token = searchParams.get('oauth_token')
    const oauth_verifier = searchParams.get('oauth_verifier')


    if (!oauth_token || !oauth_verifier) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=missing_oauth_params', req.url))
    }

    // Get oauth_token_secret from cookie
    const oauth_token_secret = req.cookies.get('twitter_oauth_token_secret')?.value
    const stored_oauth_token = req.cookies.get('twitter_oauth_token')?.value

    if (!oauth_token_secret) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=missing_token_secret', req.url))
    }

    // Verify the oauth_token matches
    if (stored_oauth_token && stored_oauth_token !== oauth_token) {
      return NextResponse.redirect(new URL('/settings?tab=accounts&error=token_mismatch', req.url))
    }


    // Create Twitter client with the temporary tokens
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    })

    // Exchange for permanent access tokens
    const { client: loggedClient, accessToken, accessSecret } = await tempClient.login(oauth_verifier)


    // Verify the credentials by fetching user info
    const twitterUser = await loggedClient.v2.me()


    // Save credentials to database (encrypted)
    // DO NOT store API keys - only user-specific tokens
    const credentials = {
      accessToken,
      accessTokenSecret: accessSecret,
      isConnected: true,
      username: twitterUser.data.username,
      userId: twitterUser.data.id,
      connectedAt: new Date().toISOString(),
    }

    await CredentialService.savePlatformCredentials(
      'twitter',
      credentials,
      user.id,
      userRow.workspace_id
    )


    // Log success
    await logAuditEvent({
      workspaceId: userRow.workspace_id,
      userId: user.id,
      platform: 'twitter',
      action: 'platform_connected',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: { 
        oauthType: 'OAuth 1.0a',
        xUsername: twitterUser.data.username,
      },
    })

    // Clear the temporary cookies and redirect to settings
    const response = NextResponse.redirect(new URL('/settings?tab=accounts&oauth_success=twitter', req.url))
    response.cookies.delete('twitter_oauth_token_secret')
    response.cookies.delete('twitter_oauth_token')

    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    const response = NextResponse.redirect(
      new URL(`/settings?tab=accounts&error=twitter_auth_failed&details=${encodeURIComponent(errorMessage)}`, req.url)
    )
    // Clear the temporary cookies on error too
    response.cookies.delete('twitter_oauth_token_secret')
    response.cookies.delete('twitter_oauth_token')
    return response
  }
}
