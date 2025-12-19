/**
 * Cron Job API Route: Publish Scheduled Posts
 * 
 * Endpoint: GET/POST /api/cron/publish-scheduled
 * 
 * This endpoint is called by external cron services (cron-job.org, Vercel Cron, etc.)
 * to automatically publish posts that have reached their scheduled time.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * @see https://cron-job.org - Free cron service (recommended)
 * @see docs/SCHEDULED_PUBLISHING.md - Full documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Configuration
// ============================================

const CONFIG = {
  MAX_RETRY_COUNT: 3,        // Max publish attempts before marking as failed
  MAX_POSTS_PER_RUN: 50,     // Max posts to process per cron run (avoid timeout)
  REQUEST_TIMEOUT_MS: 30000, // 30 second timeout for platform API calls
} as const

// ============================================
// Types
// ============================================

interface PublishResult {
  platform: string
  success: boolean
  postId?: string
  error?: string
}

interface ProcessedPost {
  postId: string
  topic: string
  status: 'published' | 'failed' | 'partial'
  platforms: PublishResult[]
}

interface CronResponse {
  success: boolean
  message?: string
  processed: number
  published: number
  failed: number
  results?: ProcessedPost[]
  error?: string
}

// ============================================
// Supabase Admin Client (bypasses RLS)
// ============================================

let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  return supabaseAdmin
}

// ============================================
// Authentication
// ============================================

function verifyAuth(request: NextRequest): { authorized: boolean; error?: string } {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no CRON_SECRET is set, allow requests (development mode)
  if (!cronSecret) {
    return { authorized: true }
  }

  // Check Bearer token
  if (authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true }
  }

  // Check x-cron-secret header (alternative)
  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret === cronSecret) {
    return { authorized: true }
  }

  return { authorized: false, error: 'Invalid or missing CRON_SECRET' }
}

// ============================================
// Platform Publishing
// ============================================

async function publishToPlatform(
  platform: string,
  post: any,
  appUrl: string
): Promise<PublishResult> {
  try {
    // Extract content for this platform (matches publishingService.ts logic)
    const rawContent = post.content?.[platform] || post.topic
    
    // Convert content to string (handle structured content objects)
    let textContent = ''
    if (typeof rawContent === 'string') {
      textContent = rawContent
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      // Try different content fields in order of preference
      textContent = rawContent.description || rawContent.content || rawContent.title || rawContent.caption || ''
    }
    
    // Fallback to topic if content is still empty
    if (!textContent && post.topic) {
      textContent = post.topic
    }

    // Extract media (from content JSONB - this is where DB stores it)
    const generatedImage = post.content?.generatedImage
    const generatedVideoUrl = post.content?.generatedVideoUrl
    const carouselImages = post.content?.carouselImages
    
    // Determine media URL (prefer image/video, fall back to first carousel image)
    let mediaUrl = generatedImage || generatedVideoUrl
    if (!mediaUrl && carouselImages && carouselImages.length > 0) {
      mediaUrl = carouselImages[0]
    }
    
    // Determine media type based on post type
    const videoPostTypes = ['reel', 'video', 'short']
    let mediaType: 'image' | 'video' = 'image'
    if (post.post_type && videoPostTypes.includes(post.post_type)) {
      mediaType = 'video'
    } else if (generatedVideoUrl) {
      mediaType = 'video'
    }


    // Build platform-specific request body
    const baseBody = {
      workspaceId: post.workspace_id,
      userId: post.created_by,
      scheduledPublish: true,
    }
    
    let body: any = { ...baseBody }
    
    // Platform-specific body fields
    switch (platform) {
      case 'facebook':
        body.message = textContent
        body.imageUrl = mediaUrl
        body.mediaType = mediaType
        body.postType = post.post_type
        break
      case 'instagram':
        body.caption = textContent
        body.imageUrl = mediaUrl
        body.mediaType = mediaType
        body.postType = post.post_type
        body.carouselUrls = carouselImages?.length >= 2 ? carouselImages : undefined
        break
      case 'linkedin':
        body.text = textContent
        body.mediaUrl = mediaUrl
        body.visibility = 'PUBLIC'
        break
      case 'twitter':
        body.text = textContent
        body.mediaUrl = mediaUrl
        break
      case 'tiktok':
        body.caption = textContent
        body.videoUrl = generatedVideoUrl
        body.videoSize = 0 // Will be determined by API
        break
      case 'youtube':
        body.title = textContent?.substring(0, 100) || post.topic?.substring(0, 100)
        body.description = textContent
        body.videoUrl = generatedVideoUrl
        body.privacyStatus = 'public'
        break
      default:
        body.content = textContent
        body.text = textContent
        body.mediaUrl = mediaUrl
    }

    // Call platform API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${appUrl}/api/${platform}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const result = await response.json()

      return {
        platform,
        success: result.success === true || response.ok,
        postId: result.postId || result.tweetId || result.id,
        error: result.error || (response.ok ? undefined : `HTTP ${response.status}`),
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        return { platform, success: false, error: 'Request timeout' }
      }
      throw fetchError
    }
  } catch (error) {
    return {
      platform,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function publishToAllPlatforms(post: any): Promise<PublishResult[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return post.platforms.map((p: string) => ({
      platform: p,
      success: false,
      error: 'NEXT_PUBLIC_APP_URL not configured',
    }))
  }

  // Publish to all platforms in parallel
  const results = await Promise.all(
    post.platforms.map((platform: string) => publishToPlatform(platform, post, appUrl))
  )

  return results
}

// ============================================
// Post Status Management
// ============================================

async function updatePostStatus(
  postId: string,
  status: 'published' | 'failed',
  errorMessage?: string,
  publishResults?: PublishResult[]
): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Get current post data
  const { data: currentPost } = await supabase
    .from('posts')
    .select('content, publish_retry_count')
    .eq('id', postId)
    .single()

  const currentRetryCount = currentPost?.publish_retry_count || 0
  const now = new Date().toISOString()

  if (status === 'published') {
    // Delete the post after successful publishing (same as manual publish)
    await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
  } else {
    // Update post with error information for failed attempts
    const newRetryCount = currentRetryCount + 1
    const updateData: Record<string, any> = {
      updated_at: now,
      last_publish_attempt: now,
      publish_retry_count: newRetryCount,
      publish_error: errorMessage,
    }

    // Only mark as permanently failed after max retries
    if (newRetryCount >= CONFIG.MAX_RETRY_COUNT) {
      updateData.status = 'failed'
    }
    // Otherwise keep as 'scheduled' for retry on next cron run

    // Store error details in content JSONB for UI display
    if (currentPost?.content) {
      updateData.content = {
        ...currentPost.content,
        _publishLog: {
          lastAttempt: now,
          retryCount: updateData.publish_retry_count,
          error: errorMessage,
          results: publishResults,
        },
      }
    }

    await supabase.from('posts').update(updateData).eq('id', postId)
  }
}

// ============================================
// Activity Logging
// ============================================

async function logPublishActivity(
  post: any,
  status: 'published' | 'failed',
  results: PublishResult[]
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const successCount = results.filter(r => r.success).length

  await supabase.from('activity_logs').insert({
    workspace_id: post.workspace_id,
    user_id: post.created_by,
    action: status === 'published' ? 'post_published' : 'post_publish_failed',
    resource_type: 'post',
    resource_id: post.id,
    details: {
      scheduled: true,
      scheduled_at: post.scheduled_at,
      published_at: new Date().toISOString(),
      platforms: results,
      success_count: successCount,
      total_platforms: post.platforms?.length || 0,
    },
  })
}

// ============================================
// Main Handler
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now()

  try {
    // 1. Verify authentication
    const auth = verifyAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', processed: 0, published: 0, failed: 0 },
        { status: 401 }
      )
    }


    // 2. Get Supabase client
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // 3. Fetch scheduled posts that are due
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .is('deleted_at', null)
      .or(`publish_retry_count.is.null,publish_retry_count.lt.${CONFIG.MAX_RETRY_COUNT}`)
      .order('scheduled_at', { ascending: true })
      .limit(CONFIG.MAX_POSTS_PER_RUN)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Database error', processed: 0, published: 0, failed: 0 },
        { status: 500 }
      )
    }

    // 4. Handle no posts case
    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled posts to process',
        processed: 0,
        published: 0,
        failed: 0,
      })
    }


    // 5. Process each post
    const results: ProcessedPost[] = []

    for (const post of scheduledPosts) {

      try {
        // Publish to all platforms
        const publishResults = await publishToAllPlatforms(post)
        const successCount = publishResults.filter(r => r.success).length
        const totalPlatforms = publishResults.length

        // Determine overall status
        let postStatus: 'published' | 'failed' | 'partial'
        if (successCount === totalPlatforms) {
          postStatus = 'published'
        } else if (successCount === 0) {
          postStatus = 'failed'
        } else {
          postStatus = 'partial'
        }

        // Update post in database
        const dbStatus = postStatus === 'partial' ? 'published' : postStatus
        const errorMsg = postStatus !== 'published'
          ? publishResults.filter(r => !r.success).map(r => `${r.platform}: ${r.error}`).join('; ')
          : undefined

        await updatePostStatus(post.id, dbStatus, errorMsg, publishResults)

        // Log activity
        await logPublishActivity(post, dbStatus, publishResults)

        results.push({
          postId: post.id,
          topic: post.topic,
          status: postStatus,
          platforms: publishResults,
        })

      } catch (error) {

        await updatePostStatus(
          post.id,
          'failed',
          error instanceof Error ? error.message : 'Processing error'
        )

        results.push({
          postId: post.id,
          topic: post.topic,
          status: 'failed',
          platforms: [{ platform: 'all', success: false, error: 'Processing error' }],
        })
      }
    }

    // 6. Calculate summary
    const published = results.filter(r => r.status === 'published' || r.status === 'partial').length
    const failed = results.filter(r => r.status === 'failed').length
    const duration = Date.now() - startTime


    return NextResponse.json({
      success: true,
      processed: results.length,
      published,
      failed,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        processed: 0,
        published: 0,
        failed: 0,
      },
      { status: 500 }
    )
  }
}

// Support POST method for manual triggers
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  return GET(request)
}
