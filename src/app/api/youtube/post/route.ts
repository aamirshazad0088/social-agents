/**
 * YouTube - Upload Video
 * POST /api/youtube/post
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   videoUrl?: string (preferred - URL to video file, fetched server-side),
 *   videoBuffer?: string (legacy - base64 encoded video, may cause 413 errors),
 *   tags?: string[],
 *   privacyStatus?: 'public' | 'private' | 'unlisted',
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { YouTubeCredentials } from '@/types'
import { createYouTubeClient, YouTubeClient } from '@/lib/youtube/client'
import { logAuditEvent } from '@/services/database/auditLogService'

// Configure body size limit for video uploads (500MB)
// Note: For App Router, this uses the new format
export const maxDuration = 300 // 5 minutes timeout for large uploads

/**
 * Refresh YouTube access token using refresh token
 * YouTube access tokens expire in 1 hour, but refresh tokens are long-lived
 */
async function refreshYouTubeToken(
  credentials: YouTubeCredentials,
  youtubeClient: YouTubeClient
): Promise<YouTubeCredentials> {
  if (!credentials.refreshToken) {
    throw new Error('No refresh token available')
  }

  const tokenData = await youtubeClient.refreshAccessToken(credentials.refreshToken)

  return {
    ...credentials,
    accessToken: tokenData.access_token,
    // Keep the existing refresh token (Google doesn't always return a new one)
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

    const { title, description, videoUrl: inputVideoUrl, videoBuffer, tags, privacyStatus } = body

    // Title and description are optional - use defaults if not provided
    const finalTitle = (title || 'Video Upload').substring(0, 100)
    const finalDescription = description || ''

    // Accept either videoUrl (preferred) or videoBuffer (legacy)
    if (!inputVideoUrl && !videoBuffer) {
      return NextResponse.json({ error: 'Video URL or buffer is required' }, { status: 400 })
    }

    // Validate title length (100 characters for YouTube)
    if (finalTitle.length > 100) {
      return NextResponse.json(
        { error: 'Title exceeds 100 characters' },
        { status: 400 }
      )
    }

    // Validate description length (5000 characters for YouTube)
    if (finalDescription.length > 5000) {
      return NextResponse.json(
        { error: 'Description exceeds 5000 characters' },
        { status: 400 }
      )
    }

    // Get YouTube credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    const credentials = await CredentialService.getPlatformCredentials(
      'youtube',
      user.id,
      userData.workspace_id,
      { useAdmin: isCronRequest }
    )

    if (!credentials) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'youtube',
        action: 'upload_failed',
        status: 'failed',
        errorCode: 'NOT_CONNECTED',
        errorMessage: 'YouTube account not connected',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { error: 'YouTube not connected' },
        { status: 400 }
      )
    }

    let youTubeCreds = credentials as YouTubeCredentials

    const clientId = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/auth/oauth/youtube/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'YouTube not configured' },
        { status: 500 }
      )
    }

    const youtubeClient = createYouTubeClient(clientId, clientSecret, redirectUri)

    // Proactive token refresh: Refresh if token expires within 5 minutes
    // This prevents failures during long video uploads
    const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before expiration
    const now = Date.now()
    const expiresAt = youTubeCreds.expiresAt ? new Date(youTubeCreds.expiresAt).getTime() : 0

    if (expiresAt && (now + REFRESH_BUFFER_MS) > expiresAt) {
      
      if (!youTubeCreds.refreshToken) {
        return NextResponse.json(
          { error: 'YouTube token expired. Please reconnect your account.' },
          { status: 401 }
        )
      }

      try {
        const refreshedCreds = await refreshYouTubeToken(youTubeCreds, youtubeClient)
        
        // Save the refreshed credentials
        await CredentialService.savePlatformCredentials(
          'youtube',
          refreshedCreds,
          user.id,
          userData.workspace_id
        )
        
        youTubeCreds = refreshedCreds
      } catch (refreshError) {
        return NextResponse.json(
          { error: 'Failed to refresh YouTube token. Please reconnect your account.' },
          { status: 401 }
        )
      }
    }

    const freshCreds = youTubeCreds

    // Get video buffer - either from URL (preferred) or from base64 string (legacy)
    let videoBufferData: Buffer
    try {
      if (inputVideoUrl) {
        // Fetch video from URL server-side (avoids 413 payload too large errors)
        const videoResponse = await fetch(inputVideoUrl)
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`)
        }
        const arrayBuffer = await videoResponse.arrayBuffer()
        videoBufferData = Buffer.from(arrayBuffer)
      } else {
        // Legacy: Convert base64 string to Buffer
        videoBufferData = Buffer.from(videoBuffer, 'base64')
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid video format' },
        { status: 400 }
      )
    }

    // Upload video to YouTube
    const uploadResponse = await youtubeClient.uploadVideo(
      freshCreds.accessToken,
      {
        title: finalTitle,
        description: finalDescription,
        tags: tags || [],
        privacyStatus: (privacyStatus || 'public') as 'public' | 'private' | 'unlisted',
        categoryId: '22', // Default to People & Blogs
        buffer: videoBufferData,
        mimeType: 'video/mp4',
      }
    )

    const videoId = uploadResponse.id


    // Build video URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Log success
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'youtube',
      action: 'upload_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: {
        videoId,
        title: finalTitle.substring(0, 100),
        privacyStatus: privacyStatus || 'public',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        videoUrl,
        title: finalTitle,
        description: finalDescription,
        platform: 'youtube',
        status: privacyStatus || 'public',
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
            platform: 'youtube',
            action: 'upload_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'UPLOAD_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
    }

    return NextResponse.json(
      { error: 'Failed to upload to YouTube' },
      { status: 500 }
    )
  }
}
