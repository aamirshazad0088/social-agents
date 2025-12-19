/**
 * Facebook - Post Content
 * POST /api/facebook/post
 *
 * Body: {
 *   message: string,
 *   imageUrl?: string, // Optional image URL
 *   link?: string, // Optional link
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { postToFacebookPage, postPhotoToFacebookPage, uploadVideoToFacebookPage, uploadFacebookReel, uploadFacebookStory, generateAppSecretProof } from '@/lib/facebook/client'
import { refreshLongLivedToken } from '@/lib/instagram/client' // Facebook uses same token refresh
import { CredentialService } from '@/services/database'
import { FacebookCredentials } from '@/types'

/**
 * Refresh Facebook access token
 * Facebook uses long-lived tokens (60 days)
 * Can be refreshed before expiration for another 60 days
 */
async function refreshFacebookToken(
  credentials: FacebookCredentials,
  appId: string,
  appSecret: string
): Promise<FacebookCredentials> {
  const tokenData = await refreshLongLivedToken(
    credentials.accessToken,
    appId,
    appSecret
  )

  return {
    ...credentials,
    accessToken: tokenData.access_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, imageUrl, link, mediaType, postType, workspaceId, userId, scheduledPublish } = body
    
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

    // Allow empty message for video posts (Reels/Stories)
    const hasMedia = imageUrl || mediaType === 'video'
    const finalMessage = message || ''
    
    if (!finalMessage && !hasMedia) {
      return NextResponse.json({ error: 'Message or media is required' }, { status: 400 })
    }

    // Validate message length (63,206 characters for Facebook)
    if (finalMessage.length > 63206) {
      return NextResponse.json(
        { error: 'Message exceeds 63,206 characters' },
        { status: 400 }
      )
    }

    // Get Facebook credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    
    const credentials = await CredentialService.getPlatformCredentials(
      'facebook',
      user.id,
      userData.workspace_id,
      { useAdmin: isCronRequest }
    )


    if (!credentials || !('accessToken' in credentials) || !('pageId' in credentials)) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }
    let facebookCreds = credentials as FacebookCredentials

    // Validate that pageId is set (not a group or other type)
    if (!facebookCreds.pageId) {
      return NextResponse.json(
        { error: 'Invalid Facebook configuration. Page ID is missing.' },
        { status: 400 }
      )
    }

    // Get app credentials for token refresh
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET

    if (!appSecret) {
      return NextResponse.json(
        { error: 'Facebook app secret not configured' },
        { status: 500 }
      )
    }

    // Proactive token refresh: Refresh if token expires within 7 days
    // Facebook tokens last 60 days, so we refresh 7 days before expiration
    const REFRESH_BUFFER_MS = 7 * 24 * 60 * 60 * 1000 // 7 days before expiration
    const now = Date.now()
    const expiresAt = facebookCreds.expiresAt ? new Date(facebookCreds.expiresAt).getTime() : 0

    if (expiresAt && (now + REFRESH_BUFFER_MS) > expiresAt) {
      
      if (!appId) {
      } else {
        try {
          const refreshedCreds = await refreshFacebookToken(facebookCreds, appId, appSecret)
          
          // Save the refreshed credentials
          await CredentialService.savePlatformCredentials(
            'facebook',
            refreshedCreds,
            user.id,
            userData.workspace_id
          )
          
          facebookCreds = refreshedCreds
        } catch (refreshError) {
          // If token is actually expired (not just close to expiring), return error
          if (now > expiresAt) {
            return NextResponse.json(
              { error: 'Access token expired. Please reconnect your Facebook account.' },
              { status: 401 }
            )
          }
          // Otherwise continue with existing token
        }
      }
    }

    // Final check: if token is actually expired and refresh failed
    if (facebookCreds.expiresAt && new Date(facebookCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Generate appsecret_proof for server-to-server API calls
    // This is required by Facebook's Graph API for enhanced security
    const appSecretProof = generateAppSecretProof(facebookCreds.accessToken, appSecret)

    let result: { id: string; post_id?: string; video_id?: string };
    let postTypeLabel = 'post';

    // Detect if it's a video (but NOT a reel - reels are handled separately)
    const isVideo = mediaType === 'video' ||
                    (imageUrl && (imageUrl.includes('.mp4') || imageUrl.includes('.mov') || imageUrl.includes('video')));

    // Detect if it's a Reel - ONLY when explicitly set as reel postType
    // Don't use mediaType === 'reel' as that could incorrectly classify regular videos
    const isReel = postType === 'reel';
    
    // Detect if it's a Story
    const isStory = postType === 'story';


    // Post based on type - check postType first for explicit types
    if (isReel && imageUrl) {
      // Upload as Facebook Reel (short-form vertical video)
      postTypeLabel = 'reel';
      result = await uploadFacebookReel(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        finalMessage,
        appSecretProof
      );
    } else if (isStory && imageUrl) {
      // Upload as Facebook Story (24hr temporary post)
      postTypeLabel = 'story';
      result = await uploadFacebookStory(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        isVideo,
        appSecretProof
      );
    } else if (imageUrl && isVideo) {
      // Upload regular video
      postTypeLabel = 'video';
      result = await uploadVideoToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        finalMessage,
        appSecretProof
      );
    } else if (imageUrl) {
      // Upload photo
      postTypeLabel = 'photo';
      result = await postPhotoToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        imageUrl,
        finalMessage,
        appSecretProof
      );
    } else {
      // Post text only or with link
      postTypeLabel = 'text';
      result = await postToFacebookPage(
        facebookCreds.pageId!,
        facebookCreds.accessToken,
        finalMessage,
        link,
        appSecretProof
      );
    }

    // Generate post URL (photo posts return post_id, text posts return id)
    const postId = result.post_id || result.id;
    const postUrl = `https://www.facebook.com/${postId}`

    return NextResponse.json({
      success: true,
      postId: postId,
      postUrl,
      message: finalMessage,
      postType: postTypeLabel,
    })
  } catch (error) {

    // Handle Facebook API errors
    const errorMessage = (error as any).message || 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to post to Facebook',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
