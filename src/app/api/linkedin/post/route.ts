/**
 * LinkedIn - Post Content
 * POST /api/linkedin/post
 *
 * Body: {
 *   text: string,
 *   visibility?: 'PUBLIC' | 'CONNECTIONS',
 *   mediaUrn?: string, // From upload-media endpoint
 * }
 * 
 * LinkedIn tokens expire in 60 days but can be refreshed.
 * We proactively refresh 7 days before expiration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { postToLinkedIn, refreshLinkedInToken } from '@/lib/linkedin/client'
import { CredentialService } from '@/services/database'
import { LinkedInCredentials } from '@/types'
import { logAuditEvent } from '@/services/database/auditLogService'

/**
 * Refresh LinkedIn access token
 * LinkedIn tokens expire in 60 days
 * Can be refreshed before expiration for another 60 days
 */
async function refreshLinkedInCredentials(
  credentials: LinkedInCredentials
): Promise<LinkedInCredentials> {
  if (!credentials.refreshToken) {
    throw new Error('No refresh token available')
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn client credentials not configured')
  }

  const tokenData = await refreshLinkedInToken(
    credentials.refreshToken,
    clientId,
    clientSecret
  )

  return {
    ...credentials,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || credentials.refreshToken,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, visibility = 'PUBLIC', mediaUrn, mediaUrl, workspaceId, userId, scheduledPublish } = body
    
    // Accept both mediaUrn and mediaUrl for compatibility
    const media = mediaUrn || mediaUrl
    
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

    // Allow empty text for media posts
    const finalText = text || ''
    
    if (!finalText && !media) {
      return NextResponse.json({ error: 'Text or media is required' }, { status: 400 })
    }

    // Validate text length (3000 characters for LinkedIn)
    if (finalText.length > 3000) {
      return NextResponse.json(
        { error: 'Post text exceeds 3000 characters' },
        { status: 400 }
      )
    }

    // Get LinkedIn credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    const credentials = await CredentialService.getPlatformCredentials(
      'linkedin',
      user.id,
      userData.workspace_id,
      { useAdmin: isCronRequest }
    )

    if (!credentials || !('accessToken' in credentials) || !('profileId' in credentials)) {
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      )
    }
    let linkedInCreds = credentials as LinkedInCredentials

    // Proactive token refresh: Refresh if token expires within 7 days
    // LinkedIn tokens last 60 days, so we refresh 7 days before expiration
    const REFRESH_BUFFER_MS = 7 * 24 * 60 * 60 * 1000 // 7 days before expiration
    const now = Date.now()
    const expiresAt = linkedInCreds.expiresAt ? new Date(linkedInCreds.expiresAt).getTime() : 0

    if (expiresAt && (now + REFRESH_BUFFER_MS) > expiresAt) {
      
      if (!linkedInCreds.refreshToken) {
        // No refresh token, check if actually expired
        if (now > expiresAt) {
          return NextResponse.json(
            { error: 'LinkedIn token expired. Please reconnect your account.' },
            { status: 401 }
          )
        }
      } else {
        try {
          const refreshedCreds = await refreshLinkedInCredentials(linkedInCreds)
          
          // Save the refreshed credentials
          await CredentialService.savePlatformCredentials(
            'linkedin',
            refreshedCreds,
            user.id,
            userData.workspace_id
          )
          
          linkedInCreds = refreshedCreds
        } catch (refreshError) {
          // If token is actually expired (not just close to expiring), return error
          if (now > expiresAt) {
            return NextResponse.json(
              { error: 'Access token expired. Please reconnect your LinkedIn account.' },
              { status: 401 }
            )
          }
          // Otherwise continue with existing token
        }
      }
    }

    // Final check: if token is actually expired and refresh failed
    if (linkedInCreds.expiresAt && new Date(linkedInCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Determine if posting to organization/company page or personal profile
    // Priority: 1) Request body postToPage, 2) Stored credential preference, 3) Default to personal
    const shouldPostToPage = body.postToPage ?? linkedInCreds.postToPage ?? false
    const hasOrganization = !!linkedInCreds.organizationId
    
    // Use organization ID if posting to page, otherwise use personal profile ID
    const authorId = (shouldPostToPage && hasOrganization) 
      ? linkedInCreds.organizationId! 
      : linkedInCreds.profileId!
    const isOrganization = shouldPostToPage && hasOrganization
    

    // Post to LinkedIn
    const result = await postToLinkedIn(
      linkedInCreds.accessToken,
      authorId,
      finalText,
      visibility,
      media || mediaUrn,
      isOrganization
    )

    // Generate post URL
    const postUrl = `https://www.linkedin.com/feed/update/${result.id}`

    // Log success
    await logAuditEvent({
      workspaceId: userData.workspace_id,
      userId: user.id,
      platform: 'linkedin',
      action: 'post_successful',
      status: 'success',
      metadata: {
        postId: result.id,
        textPreview: finalText.substring(0, 50),
      },
    })

    return NextResponse.json({
      success: true,
      postId: result.id,
      postUrl,
      text: finalText,
    })
  } catch (error) {

    // Handle LinkedIn API errors
    const errorMessage = (error as any).message || 'Unknown error'

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
            platform: 'linkedin',
            action: 'post_failed',
            status: 'failed',
            errorMessage: errorMessage,
            errorCode: 'POST_ERROR',
          })
        }
      }
    } catch (auditError) {
    }

    return NextResponse.json(
      {
        error: 'Failed to post to LinkedIn',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
