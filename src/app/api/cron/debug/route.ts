import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date().toISOString()

    // Get all posts (scheduled, failed, published) with FULL content to debug
    const { data: allScheduled, error: allError } = await supabase
      .from('posts')
      .select('*')
      .in('status', ['scheduled', 'failed', 'published'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (allError) {
      return NextResponse.json({ error: 'Database error', details: allError }, { status: 500 })
    }

    return NextResponse.json({
      currentTime: now,
      allScheduledPosts: allScheduled?.length || 0,
      posts: allScheduled?.map(p => ({
        id: p.id,
        topic: p.topic,
        status: p.status,
        platforms: p.platforms,
        post_type: p.post_type,
        scheduled_at: p.scheduled_at,
        retry_count: p.publish_retry_count,
        // CRITICAL: Check if these exist
        created_by: p.created_by,
        workspace_id: p.workspace_id,
        // Show content structure for debugging
        content_keys: p.content ? Object.keys(p.content) : [],
        has_generatedImage: !!p.content?.generatedImage,
        has_generatedVideoUrl: !!p.content?.generatedVideoUrl,
        has_carouselImages: !!p.content?.carouselImages,
        carouselImages_count: p.content?.carouselImages?.length || 0,
        // Show platform content
        facebook_content: p.content?.facebook,
        instagram_content: p.content?.instagram,
        linkedin_content: p.content?.linkedin,
        twitter_content: p.content?.twitter,
        // Media URLs
        generatedImage: p.content?.generatedImage?.substring(0, 100),
        generatedVideoUrl: p.content?.generatedVideoUrl?.substring(0, 100),
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
