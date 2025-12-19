/**
 * X (Twitter) - Post Tweet
 * POST /api/twitter/post
 *
 * Body: {
 *   text: string,
 *   mediaIds?: string[], // IDs from media upload endpoint
 * }
 * 
 * Uses OAuth 1.0a authentication (accessToken + accessTokenSecret)
 * Tokens don't expire - valid until user revokes access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createUserTwitterClient } from '@/lib/twitter/client'
import { CredentialService } from '@/services/database'
import { logAuditEvent } from '@/services/database/auditLogService'

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  try {
    const body = await req.json()
    const { text, mediaIds, workspaceId, userId, scheduledPublish } = body
    
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

    // Allow empty text for media-only tweets
    const finalText = text || ''
    const hasMedia = mediaIds || body.mediaUrl
    
    if (!finalText && !hasMedia) {
      return NextResponse.json({ error: 'Text or media is required' }, { status: 400 })
    }

    // Validate text length (280 characters for X)
    if (finalText.length > 280) {
      return NextResponse.json(
        { error: 'Post text exceeds 280 characters' },
        { status: 400 }
      )
    }

    // Get X credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    
    let credentials: any = null
    try {
      credentials = await CredentialService.getPlatformCredentials(
        'twitter',
        user.id,
        userData.workspace_id,
        { useAdmin: isCronRequest }
      )
    } catch (credError) {
    }

    // Check if we have valid credentials
    // OAuth 1.0a requires both accessToken and accessTokenSecret
    if (!credentials || !credentials.accessToken || !credentials.accessTokenSecret) {
      return NextResponse.json(
        { error: 'X not connected. Please connect your X account in Settings.' },
        { status: 400 }
      )
    }


    // Create X client with user's OAuth 1.0a tokens
    const twitterClient = createUserTwitterClient(
      credentials.accessToken,
      credentials.accessTokenSecret
    )

    // Post tweet
    const tweetPayload: any = { text: finalText }

    // Add media if provided
    if (mediaIds && Array.isArray(mediaIds) && mediaIds.length > 0) {
      tweetPayload.media = {
        media_ids: mediaIds,
      }
    }

    const tweet = await twitterClient.v2.tweet(tweetPayload)

    // Generate post URL (x.com is the new domain)
    const tweetUrl = `https://x.com/${credentials.username}/status/${tweet.data.id}`

    // Log success
    await logAuditEvent({
      workspaceId: userData.workspace_id,
      userId: user.id,
      platform: 'twitter',
      action: 'post_successful',
      status: 'success',
      ipAddress: ipAddress || undefined,
      metadata: {
        tweetId: tweet.data.id,
        textPreview: finalText.substring(0, 50),
      },
    })

    return NextResponse.json({
      success: true,
      tweetId: tweet.data.id,
      tweetUrl,
      text: tweet.data.text,
    })
  } catch (error) {

    // Handle Twitter API errors
    const errorMessage = (error as any).data?.detail || (error as Error).message
    const errorCode = (error as any).code || 'UNKNOWN'

    // Check if it's an authentication error (token expired/revoked)
    const isAuthError = errorCode === 401 || 
                        errorCode === 403 || 
                        errorMessage?.includes('authentication') ||
                        errorMessage?.includes('unauthorized') ||
                        errorMessage?.includes('token')

    // Log error
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
            platform: 'twitter',
            action: 'post_failed',
            status: 'failed',
            errorMessage: errorMessage,
            errorCode: isAuthError ? 'AUTH_ERROR' : 'POST_ERROR',
            ipAddress: ipAddress || undefined,
          })
        }
      }
    } catch (auditError) {
    }

    // Return appropriate error message
    if (isAuthError) {
      return NextResponse.json(
        {
          error: 'X authentication failed. Please reconnect your account.',
          details: errorMessage,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to post to X',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
