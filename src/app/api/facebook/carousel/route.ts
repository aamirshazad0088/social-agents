/**
 * Facebook - Post Carousel (Multi-Photo)
 * POST /api/facebook/carousel
 *
 * Body: {
 *   message: string,
 *   imageUrls: string[], // Array of image URLs
 * }
 *
 * Returns: { success: boolean, postId: string, postUrl: string }
 * 
 * Facebook Graph API Multi-Photo Post:
 * 1. Upload each photo unpublished
 * 2. Create post with attached_media array
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { generateAppSecretProof } from '@/lib/facebook/client'

interface FacebookCredentials {
  accessToken: string;
  pageId?: string;
  pageAccessToken?: string;
  expiresAt?: string;
}

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
    const { message, imageUrls } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 image URLs are required for carousel' },
        { status: 400 }
      )
    }

    // Get Facebook credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'facebook',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials)) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }
    const fbCreds = credentials as FacebookCredentials

    // Check if token is expired
    if (fbCreds.expiresAt && new Date(fbCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Use page access token if available, otherwise user token
    const accessToken = fbCreds.pageAccessToken || fbCreds.accessToken
    const pageId = fbCreds.pageId || 'me'

    // Get app secret for appsecret_proof
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    if (!appSecret) {
      return NextResponse.json(
        { error: 'Facebook app secret not configured' },
        { status: 500 }
      )
    }

    // Generate appsecret_proof for server-to-server API calls
    const appSecretProof = generateAppSecretProof(accessToken, appSecret)


    // Step 1: Upload each photo as unpublished
    const photoIds: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      
      try {
        // Upload photo unpublished
        const uploadResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: imageUrl,
              published: false, // Upload as unpublished
              access_token: accessToken,
              appsecret_proof: appSecretProof,
            }),
          }
        )

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error?.message || `Failed to upload photo ${i + 1}`)
        }

        const uploadData = await uploadResponse.json()
        photoIds.push(uploadData.id)
      } catch (uploadError) {
        return NextResponse.json(
          { error: `Failed to upload photo ${i + 1}: ${(uploadError as Error).message}` },
          { status: 500 }
        )
      }
    }

    // Step 2: Create post with attached_media
    const attachedMedia = photoIds.map(id => ({ media_fbid: id }))

    const postResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          attached_media: attachedMedia,
          access_token: accessToken,
          appsecret_proof: appSecretProof,
        }),
      }
    )

    if (!postResponse.ok) {
      const errorData = await postResponse.json()
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to create carousel post' },
        { status: 500 }
      )
    }

    const postData = await postResponse.json()
    const postId = postData.id

    // Generate post URL
    const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`


    return NextResponse.json({
      success: true,
      postId,
      postUrl,
      imageCount: imageUrls.length,
    })
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Failed to post carousel to Facebook',
        details: (error as any).message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
