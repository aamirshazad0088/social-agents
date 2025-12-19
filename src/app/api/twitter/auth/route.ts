/**
 * X (Twitter) OAuth 1.0a - Start Authentication Flow
 * POST /api/twitter/auth
 *
 * Uses OAuth 1.0a which provides accessToken + accessTokenSecret
 * Required for full API access including media upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createTwitterClient } from '@/lib/twitter/client'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  
  try {
    // Check authentication
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace_id
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create Twitter client for OAuth 1.0a
    const twitterClient = createTwitterClient()
    
    // Get callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const callbackUrl = `${baseUrl}/api/twitter/callback`


    // Generate OAuth 1.0a request token and auth link
    const authLink = await twitterClient.generateAuthLink(callbackUrl, {
      linkMode: 'authorize',
    })


    // Store oauth_token_secret in cookie for callback
    const response = NextResponse.json({
      success: true,
      redirectUrl: authLink.url,
    })

    response.cookies.set('twitter_oauth_token_secret', authLink.oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    })

    // Also store the oauth_token for verification
    response.cookies.set('twitter_oauth_token', authLink.oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    })

    // Log initiation
    await logAuditEvent({
      workspaceId: userData.workspace_id,
      userId: user.id,
      platform: 'twitter',
      action: 'oauth_initiation_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: { oauthType: 'OAuth 1.0a' },
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to initiate X authentication',
        details: (error as Error).message
      },
      { status: 500 }
    )
  }
}
