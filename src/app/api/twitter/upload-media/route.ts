/**
 * X (Twitter) - Upload Media
 * POST /api/twitter/upload-media
 *
 * Body: {
 *   mediaData: string, // base64 encoded image or video
 *   mediaType: 'image' | 'video'
 * }
 *
 * Returns: { mediaId: string }
 * 
 * IMPORTANT: Media upload uses v1 API which requires OAuth 1.0a credentials.
 * OAuth 2.0 users cannot upload media directly - they can only post text.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createUserTwitterClient } from '@/lib/twitter/client'
import { CredentialService } from '@/services/database'
import { EUploadMimeType } from 'twitter-api-v2'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    // Get request body
    const body = await req.json()
    const { mediaData, mediaUrl, mediaType } = body

    // Accept either mediaData (base64) or mediaUrl (public URL)
    if (!mediaData && !mediaUrl) {
      return NextResponse.json(
        { error: 'mediaData or mediaUrl is required' },
        { status: 400 }
      )
    }

    if (!mediaType) {
      return NextResponse.json(
        { error: 'mediaType is required' },
        { status: 400 }
      )
    }

    // Get X credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'twitter',
      user.id,
      userData.workspace_id
    )

    // Check if we have valid credentials
    if (!credentials || !credentials.accessToken) {
      return NextResponse.json({ error: 'X not connected. Please connect your X account in Settings.' }, { status: 400 })
    }

    // OAuth 1.0a requires both accessToken and accessTokenSecret for media upload
    if (!credentials.accessTokenSecret) {
      return NextResponse.json(
        { 
          error: 'Media upload requires OAuth 1.0a authentication. Please reconnect your X account.',
          code: 'MISSING_TOKEN_SECRET'
        },
        { status: 400 }
      )
    }

    const twitterClient = createUserTwitterClient(
      credentials.accessToken,
      credentials.accessTokenSecret
    )

    // Get media buffer from URL or base64
    let buffer: Buffer;
    
    if (mediaUrl) {
      // Fetch media from URL
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch media from URL' },
          { status: 400 }
        )
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Convert base64 to Buffer
      const base64Data = mediaData.replace(/^data:(image|video)\/\w+;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')
    }

    // Determine MIME type
    let mimeType: EUploadMimeType
    if (mediaType === 'video') {
      mimeType = EUploadMimeType.Mp4
    } else if (mediaType === 'gif') {
      mimeType = EUploadMimeType.Gif
    } else {
      // Default to JPEG for images
      mimeType = EUploadMimeType.Jpeg
    }

    // Upload media to X using v1 API
    const mediaId = await twitterClient.v1.uploadMedia(buffer, {
      mimeType,
    })


    return NextResponse.json({
      success: true,
      mediaId,
    })
  } catch (error) {

    // Handle X API errors
    const errorMessage = (error as any).data?.detail || (error as Error).message

    return NextResponse.json(
      {
        error: 'Failed to upload media to X',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
