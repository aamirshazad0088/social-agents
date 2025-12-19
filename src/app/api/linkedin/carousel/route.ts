/**
 * LinkedIn - Post Carousel (MultiImage)
 * POST /api/linkedin/carousel
 *
 * Body: {
 *   text: string,
 *   imageUrls: string[], // Array of image URLs (2-20 images)
 *   visibility?: 'PUBLIC' | 'CONNECTIONS'
 * }
 *
 * Returns: { success: boolean, postId: string, postUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { 
  initializeImageUpload, 
  uploadImageBinary, 
  postCarouselToLinkedIn 
} from '@/lib/linkedin/client'
import { CredentialService } from '@/services/database'
import { LinkedInCredentials } from '@/types'
import { logAuditEvent } from '@/services/database/auditLogService'

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
    const { text, imageUrls, visibility = 'PUBLIC', postToPage } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json({ error: 'imageUrls array is required' }, { status: 400 })
    }

    if (imageUrls.length < 2) {
      return NextResponse.json(
        { error: 'LinkedIn carousel requires at least 2 images' },
        { status: 400 }
      )
    }

    if (imageUrls.length > 20) {
      return NextResponse.json(
        { error: 'LinkedIn carousel supports maximum 20 images' },
        { status: 400 }
      )
    }

    // Validate text length (3000 characters for LinkedIn)
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'Post text exceeds 3000 characters' },
        { status: 400 }
      )
    }

    // Get LinkedIn credentials from database
    const credentials = await CredentialService.getPlatformCredentials(
      'linkedin',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials) || !('profileId' in credentials)) {
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      )
    }
    const linkedInCreds = credentials as LinkedInCredentials

    // Check if token is expired
    if (linkedInCreds.expiresAt && new Date(linkedInCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }


    // Upload all images
    const imageUrns: string[] = []

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      
      try {
        // Fetch image from URL
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image ${i + 1} from URL`)
        }
        
        const arrayBuffer = await imageResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Validate image size (10MB max)
        if (buffer.length > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: `Image ${i + 1} exceeds 10MB limit` },
            { status: 400 }
          )
        }

        // Determine if posting to organization/company page or personal profile
        const shouldPostToPage = postToPage ?? linkedInCreds.postToPage ?? false
        const hasOrganization = !!linkedInCreds.organizationId
        const authorId = (shouldPostToPage && hasOrganization) 
          ? linkedInCreds.organizationId! 
          : linkedInCreds.profileId!
        const isOrganization = shouldPostToPage && hasOrganization

        // Initialize upload
        const { uploadUrl, asset } = await initializeImageUpload(
          linkedInCreds.accessToken,
          authorId,
          isOrganization
        )

        // Upload binary
        await uploadImageBinary(uploadUrl, buffer, linkedInCreds.accessToken)

        imageUrns.push(asset)
      } catch (uploadError) {
        return NextResponse.json(
          { error: `Failed to upload image ${i + 1}: ${(uploadError as Error).message}` },
          { status: 500 }
        )
      }
    }

    // Determine if posting to organization/company page or personal profile
    const shouldPostToPage = postToPage ?? linkedInCreds.postToPage ?? false
    const hasOrganization = !!linkedInCreds.organizationId
    const authorId = (shouldPostToPage && hasOrganization) 
      ? linkedInCreds.organizationId! 
      : linkedInCreds.profileId!
    const isOrganization = shouldPostToPage && hasOrganization


    // Create carousel post
    const result = await postCarouselToLinkedIn(
      linkedInCreds.accessToken,
      authorId,
      text,
      imageUrns,
      visibility,
      isOrganization
    )

    // Generate post URL
    const postUrl = `https://www.linkedin.com/feed/update/${result.id}`

    // Log success
    await logAuditEvent({
      workspaceId: userData.workspace_id,
      userId: user.id,
      platform: 'linkedin',
      action: 'carousel_post_successful',
      status: 'success',
      metadata: {
        postId: result.id,
        imageCount: imageUrls.length,
        textPreview: text.substring(0, 50),
      },
    })

    return NextResponse.json({
      success: true,
      postId: result.id,
      postUrl,
      imageCount: imageUrls.length,
    })
  } catch (error) {

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
            action: 'carousel_post_failed',
            status: 'failed',
            errorMessage: errorMessage,
            errorCode: 'CAROUSEL_POST_ERROR',
          })
        }
      }
    } catch (auditError) {
    }

    return NextResponse.json(
      {
        error: 'Failed to post carousel to LinkedIn',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
