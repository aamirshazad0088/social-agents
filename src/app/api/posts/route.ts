import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';
import { Post } from '@/types';
import { getCacheHeaders } from '@/lib/cache/cacheHeaders';
import { 
  apiHandler, 
  authApiHandler,
  successResponse,
  successResponseWithCache,
  throwValidationError,
  throwNotFoundError
} from '@/core/middleware/apiHandler';

// Route segment config (App Router)
export const runtime = 'nodejs';
export const maxDuration = 60;

// Helper to check if string is base64 data URL
function isBase64DataUrl(str: string | undefined): boolean {
  if (!str) return false;
  return str.startsWith('data:') && str.includes(';base64,');
}

// Database post type for transformation
interface DbPost {
  id: string;
  topic: string;
  platforms: string[];
  content: Record<string, unknown>;
  post_type: string;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  published_at: string | null;
  engagement_score: number;
  engagement_suggestions: string[] | null;
}

// Transform database format to frontend format
function transformDbPost(dbPost: DbPost) {
  const content = dbPost.content as Record<string, unknown> || {};
  return {
    id: dbPost.id,
    topic: dbPost.topic,
    platforms: dbPost.platforms,
    content: dbPost.content,
    postType: dbPost.post_type || 'post',
    status: dbPost.status,
    createdAt: dbPost.created_at,
    scheduledAt: dbPost.scheduled_at,
    publishedAt: dbPost.published_at,
    engagementScore: dbPost.engagement_score,
    engagementSuggestions: dbPost.engagement_suggestions,
    generatedImage: content.generatedImage,
    carouselImages: content.carouselImages,
    generatedVideoUrl: content.generatedVideoUrl,
    platformTemplates: content.platformTemplates,
    imageMetadata: content.imageMetadata,
    generatedImageTimestamp: content.generatedImageTimestamp,
    imageGenerationProgress: content.imageGenerationProgress,
    isGeneratingImage: content.isGeneratingImage || false,
    isGeneratingVideo: content.isGeneratingVideo || false,
    videoGenerationStatus: content.videoGenerationStatus || '',
    videoOperation: content.videoOperation,
  };
}

// GET - Fetch all posts for workspace
export const GET = authApiHandler(async (request, { auth }) => {
  const searchParams = request.nextUrl.searchParams;
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    throwValidationError('workspace_id is required');
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const posts = (data as DbPost[]).map(transformDbPost);

  // Use 'none' cache to ensure fresh data after post creation
  return successResponseWithCache(posts, 'none');
});

// POST - Create new post
export const POST = authApiHandler(async (request, { auth }) => {
  const body = await request.json();
  const { post, workspaceId } = body;

  if (!post || !workspaceId) {
    throwValidationError('post and workspaceId are required');
  }

  const supabase = await createServerClient();

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

  // Images should already be uploaded to storage from client side
  // Only upload if still base64 (fallback for legacy data)
  let imageUrl = generatedImage;
  let videoUrl = generatedVideoUrl;
  let carouselUrls = carouselImages;

  if (isBase64DataUrl(generatedImage)) {
    imageUrl = await uploadBase64Image(generatedImage, `post-${post.id}-image`);
  }

  // Upload carousel images if they're base64 (same as single images)
  if (carouselImages && Array.isArray(carouselImages)) {
    const needsUpload = carouselImages.some((img: string) => isBase64DataUrl(img));
    if (needsUpload) {
      carouselUrls = await Promise.all(
        carouselImages.map(async (img: string, index: number) => {
          if (isBase64DataUrl(img)) {
            return await uploadBase64Image(img, `post-${post.id}-carousel-${index}`);
          }
          return img;
        })
      );
    }
  }

  if (isBase64DataUrl(generatedVideoUrl)) {
    videoUrl = await uploadBase64Image(generatedVideoUrl, `post-${post.id}-video`);
  }

  const dbPost: Record<string, unknown> = {
    id: post.id,
    workspace_id: workspaceId,
    created_by: auth.userId,
    topic: post.topic,
    platforms: post.platforms,
    post_type: post.postType || (carouselUrls && carouselUrls.length > 0 ? 'carousel' : 'post'),
    content: {
      ...content,
      generatedImage: imageUrl,
      carouselImages: carouselUrls,
      generatedVideoUrl: videoUrl,
      isGeneratingImage,
      isGeneratingVideo,
      videoGenerationStatus,
      videoOperation,
      platformTemplates,
      imageMetadata,
      generatedImageTimestamp,
      imageGenerationProgress,
    },
    status: post.status,
  };

  // Only add optional columns if they have values (avoids schema cache issues)
  if (post.scheduledAt) dbPost.scheduled_at = post.scheduledAt;
  if (post.publishedAt) dbPost.published_at = post.publishedAt;

  // Use type assertion to work with Supabase's strict typing
  // The dbPost object matches the posts table schema
  const { data, error } = await (supabase
    .from('posts') as ReturnType<typeof supabase.from>)
    .insert(dbPost)
    .select()
    .single();

  if (error) throw error;

  // Log activity - use type assertion for activity_logs table
  await (supabase.from('activity_logs') as ReturnType<typeof supabase.from>).insert({
    workspace_id: workspaceId,
    user_id: auth.userId,
    action: 'create',
    resource_type: 'post',
    resource_id: (data as { id: string }).id,
    details: {},
  });

  return successResponse(data, 201, 'Post created successfully');
});