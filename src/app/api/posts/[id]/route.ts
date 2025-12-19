import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

// Route segment config (App Router)
export const runtime = 'nodejs';
export const maxDuration = 60;

// Helper to check if string is base64 data URL
function isBase64DataUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith('data:') && str.includes(';base64,');
}

// PUT - Update existing post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post, workspaceId } = body;

    if (!post || !workspaceId) {
      return NextResponse.json(
        { error: 'post and workspaceId required' },
        { status: 400 }
      );
    }

    // Extract fields that go into content JSONB
    const {
      generatedImage,
      carouselImages,
      generatedVideoUrl,
      isGeneratingImage,
      isGeneratingVideo,
      videoGenerationStatus,
      videoOperation,
      platformTemplates,
      imageMetadata,
      generatedImageTimestamp,
      imageGenerationProgress,
      content,
      ...rest
    } = post;

    const { id } = await params;

    // Fetch existing post to preserve fields that aren't being updated
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('content')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError) {
    }

    const existingContent = (existingPost as any)?.content || {};


    // Images should be pre-uploaded from client (carousel) or uploaded here (single)
    // Preserve existing values if not provided in update
    let imageUrl = generatedImage ?? existingContent.generatedImage;
    let videoUrl = generatedVideoUrl ?? existingContent.generatedVideoUrl;
    let carouselUrls = carouselImages ?? existingContent.carouselImages;


    // Single image - upload if base64
    if (isBase64DataUrl(generatedImage)) {
      try {
        imageUrl = await uploadBase64Image(generatedImage, `post-${id}-image`);
      } catch (error) {
      }
    }

    // Carousel images - should already be URLs from client upload
    if (carouselImages && Array.isArray(carouselImages) && carouselImages.length > 0) {
      const hasBase64 = carouselImages.some(img => isBase64DataUrl(img));
      if (hasBase64) {
        // Don't upload - payload too large, let it fail so client knows
      }
    }

    if (isBase64DataUrl(generatedVideoUrl)) {
      try {
        videoUrl = await uploadBase64Image(generatedVideoUrl, `post-${id}-video`);
      } catch (error) {
      }
    }

    // Build update object with only valid columns
    // Note: is_carousel, carousel_slide_count may not exist in all schemas
    // Merge existing content with new content to preserve fields not being updated
    const mergedContent = {
      ...existingContent,  // Start with existing content
      ...content,          // Override with new content
      // Explicitly set media fields (use preserved values from above)
      generatedImage: imageUrl,
      carouselImages: carouselUrls,
      generatedVideoUrl: videoUrl,
      // Set other fields, preserving existing if not provided
      isGeneratingImage: isGeneratingImage ?? existingContent.isGeneratingImage,
      isGeneratingVideo: isGeneratingVideo ?? existingContent.isGeneratingVideo,
      videoGenerationStatus: videoGenerationStatus ?? existingContent.videoGenerationStatus,
      videoOperation: videoOperation ?? existingContent.videoOperation,
      platformTemplates: platformTemplates ?? existingContent.platformTemplates,
      imageMetadata: imageMetadata ?? existingContent.imageMetadata,
      generatedImageTimestamp: generatedImageTimestamp ?? existingContent.generatedImageTimestamp,
      imageGenerationProgress: imageGenerationProgress ?? existingContent.imageGenerationProgress,
    };


    const dbPost: Record<string, any> = {
      topic: post.topic,
      platforms: post.platforms,
      post_type: post.postType || (carouselUrls && carouselUrls.length > 0 ? 'carousel' : 'post'),
      content: mergedContent,
      status: post.status,
    };
    
    // Only add optional columns if they have values (avoids schema cache errors)
    if (post.scheduledAt) dbPost.scheduled_at = post.scheduledAt;
    if (post.publishedAt) dbPost.published_at = post.publishedAt;

    const { data, error } = await (supabase as any)
      .from('posts')
      .update(dbPost)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'update',
      resource_type: 'post',
      resource_id: id,
      details: {},
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Log activity
    await (supabase as any).from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: 'delete',
      resource_type: 'post',
      resource_id: id,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}