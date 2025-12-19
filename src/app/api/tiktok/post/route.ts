/**
 * TikTok - Post Content
 * POST /api/tiktok/post
 *
 * Body: {
 *   caption: string,
 *   videoUrl: string, // Publicly accessible video URL
 *   videoSize: number, // Size in bytes
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { TikTokCredentials } from '@/types'
import { createTikTokClient, TikTokClient } from '@/lib/tiktok/client'
import { logAuditEvent } from '@/services/database/auditLogService'

/**
 * Refresh TikTok access token using refresh token
 * TikTok access tokens expire in ~24 hours
 */
async function refreshTikTokToken(
  credentials: TikTokCredentials,
  tiktokClient: TikTokClient
): Promise<TikTokCredentials> {
  if (!credentials.refreshToken) {
    throw new Error('No refresh token available')
  }

  const tokenData = await tiktokClient.refreshAccessToken(credentials.refreshToken)

  return {
    ...credentials,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || credentials.refreshToken,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  }
}

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

  try {
    
    const body = await req.json()
    const { workspaceId, userId, scheduledPublish } = body
    
    // Check if this is a cron request
    const cronSecret = req.headers.get('x-cron-secret')
    const isCronRequest = cronSecret === process.env.CRON_SECRET && scheduledPublish === true
    
    let user: any
    let userData: { workspace_id: string } | null = null
    
    if (isCronRequest) {
      // Cron request: use provided userId and workspaceId
      if (!userId || !workspaceId) {
        return NextResponse.json({ error: 'userId and workspaceId required for scheduled publish' }, { status: 400 })
      }
      user = { id: userId }
      userData = { workspace_id: workspaceId }
    } else {
      // Regular user request: check session
      const supabase = await createServerClient()
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser()

      if (!sessionUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser

      // Get workspace_id
      const { data: userDataResult } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', user.id)
        .maybeSingle<{ workspace_id: string }>()

      if (!userDataResult) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      userData = userDataResult
    }

    const { caption, videoUrl, videoSize } = body

    // Caption is optional for TikTok videos
    const finalCaption = caption || ''

    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
    }

    // Video size is optional - will be determined by API if not provided
    const finalVideoSize = videoSize || 0

    // Validate caption length (2200 characters for TikTok)
    if (finalCaption.length > 2200) {
      return NextResponse.json(
        { error: 'Caption exceeds 2200 characters' },
        { status: 400 }
      )
    }

    // Get TikTok credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    const credentials = await CredentialService.getPlatformCredentials(
      'tiktok',
      user.id,
      userData.workspace_id,
      { useAdmin: isCronRequest }
    )

    if (!credentials) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'tiktok',
        action: 'post_failed',
        status: 'failed',
        errorCode: 'NOT_CONNECTED',
        errorMessage: 'TikTok account not connected',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'TikTok not connected' },
        { status: 400 }
      )
    }

    let tikTokCreds = credentials as TikTokCredentials

    const clientKey = process.env.TIKTOK_CLIENT_ID
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/oauth/tiktok/callback`

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'TikTok not configured' },
        { status: 500 }
      )
    }

    const tiktokClient = createTikTokClient(clientKey, clientSecret, redirectUri)

    // Proactive token refresh: Refresh if token expires within 30 minutes
    // TikTok tokens last ~24 hours, so we refresh 30 min before expiration
    const REFRESH_BUFFER_MS = 30 * 60 * 1000 // 30 minutes before expiration
    const now = Date.now()
    const expiresAt = tikTokCreds.expiresAt ? new Date(tikTokCreds.expiresAt).getTime() : 0

    if (expiresAt && (now + REFRESH_BUFFER_MS) > expiresAt) {
      
      if (!tikTokCreds.refreshToken) {
        return NextResponse.json(
          { error: 'TikTok token expired. Please reconnect your account.' },
          { status: 401 }
        )
      }

      try {
        const refreshedCreds = await refreshTikTokToken(tikTokCreds, tiktokClient)
        
        // Save the refreshed credentials
        await CredentialService.savePlatformCredentials(
          'tiktok',
          refreshedCreds,
          user.id,
          userData.workspace_id
        )
        
        tikTokCreds = refreshedCreds
      } catch (refreshError) {
        return NextResponse.json(
          { error: 'Failed to refresh TikTok token. Please reconnect your account.' },
          { status: 401 }
        )
      }
    }

    const freshCreds = tikTokCreds

    // TikTok API v2: Initialize video publish with PULL_FROM_URL
    // We MUST use a proxy URL from our verified domain
    const proxyUrl = `${baseUrl}/api/tiktok/proxy-media?url=${encodeURIComponent(videoUrl)}`
    
    const publishResponse = await tiktokClient.initVideoPublish(
      freshCreds.accessToken,
      {
        title: finalCaption,
        videoUrl: proxyUrl, // Use proxy URL for domain verification
        privacyLevel: 'SELF_ONLY', // Unaudited apps can only post privately
      }
    )

    const publishId = publishResponse.data?.publish_id
    if (!publishId) {
      throw new Error('No publish_id returned from TikTok')
    }


    // Note: TikTok processes videos asynchronously
    // The video won't be immediately available - it goes through processing
    const videoId = publishId
    const shareUrl = `https://www.tiktok.com/@${freshCreds.username}`


    // Log success
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'tiktok',
      action: 'post_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: {
        videoId,
        caption: finalCaption.substring(0, 100),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        shareUrl,
        caption: finalCaption,
        platform: 'tiktok',
      },
    })
  } catch (error) {

    // Attempt to log error
    try {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('workspace_id')
          .eq('id', user.id)
          .maybeSingle()

        if (userRow) {
          await logAuditEvent({
            workspaceId: (userRow as any).workspace_id,
            userId: user.id,
            platform: 'tiktok',
            action: 'post_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'POST_ERROR',
            ipAddress: ipAddress || undefined,
          })
        }
      }
    } catch (auditError) {
    }

    return NextResponse.json(
      { error: 'Failed to post to TikTok' },
      { status: 500 }
    )
  }
}
