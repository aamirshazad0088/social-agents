/**
 * Post Service - Supabase Database Operations
 * Handles all CRUD operations for posts
 */

import { createServerClient } from '@/lib/supabase/server'
import { Post, PostStatus, Platform } from '@/types'

let supabaseInstance: any = null

async function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = await createServerClient()
  }
  return supabaseInstance
}

export class PostService {
  /**
   * Get all posts for the current user's workspace
   */
  static async getAllPosts(workspaceId: string): Promise<Post[]> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform database format to app format
      return data.map((post: any) => PostService.transformFromDB(post))
    } catch (error) {
      throw error
    }
  }

  /**
   * Get a single post by ID
   */
  static async getPostById(postId: string, workspaceId: string): Promise<Post | null> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error

      return data ? this.transformFromDB(data) : null
    } catch (error) {
      return null
    }
  }

  /**
   * Create a new post
   */
  static async createPost(post: Post, userId: string, workspaceId: string): Promise<Post> {
    try {
      const supabase = await getSupabase()
      const dbPost = this.transformToDB(post, userId, workspaceId)

      const { data, error } = await supabase
        .from('posts')
        .insert(dbPost)
        .select()
        .maybeSingle()

      if (error) throw error

      // Log activity
      await this.logActivity(workspaceId, userId, 'create', 'post', data!.id)

      return this.transformFromDB(data)
    } catch (error) {
      throw error
    }
  }

  /**
   * Update an existing post
   */
  static async updatePost(post: Post, userId: string, workspaceId: string): Promise<Post> {
    try {
      const supabase = await getSupabase()
      const dbPost = this.transformToDB(post, userId, workspaceId)

      const { data, error } = await (supabase.from('posts') as any)
        .update(dbPost)
        .eq('id', post.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity(workspaceId, userId, 'update', 'post', (data as any).id)

      return this.transformFromDB(data)
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete a post
   */
  static async deletePost(postId: string, userId: string, workspaceId: string): Promise<void> {
    try {
      const supabase = await getSupabase()
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      // Log activity
      await this.logActivity(workspaceId, userId, 'delete', 'post', postId)
    } catch (error) {
      throw error
    }
  }

  /**
   * Get posts by status
   */
  static async getPostsByStatus(status: PostStatus, workspaceId: string): Promise<Post[]> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map((post: any) => PostService.transformFromDB(post))
    } catch (error) {
      throw error
    }
  }

  /**
   * Get scheduled posts (for publishing)
   */
  static async getScheduledPosts(workspaceId: string): Promise<Post[]> {
    try {
      const supabase = await getSupabase()
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'scheduled')
        .lte('scheduled_at', now)

      if (error) throw error

      return data.map((post: any) => PostService.transformFromDB(post))
    } catch (error) {
      throw error
    }
  }

  /**
   * Update post status
   */
  static async updatePostStatus(
    postId: string,
    status: PostStatus,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      const updateData: any = { status }

      // Add published_at timestamp when status is published
      if (status === 'published') {
        updateData.published_at = new Date().toISOString()
      }

      const supabase = await getSupabase()
      const { error } = await (supabase.from('posts') as any)
        .update(updateData)
        .eq('id', postId)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      // Log activity
      await this.logActivity(workspaceId, userId, 'update_status', 'post', postId, { status })
    } catch (error) {
      throw error
    }
  }

  /**
   * Transform database row to Post type
   */
  static transformFromDB(dbPost: any): Post {
    return {
      id: dbPost.id,
      topic: dbPost.topic,
      platforms: dbPost.platforms as Platform[],
      content: dbPost.content,
      status: dbPost.status as PostStatus,
      createdAt: dbPost.created_at,
      scheduledAt: dbPost.scheduled_at,
      publishedAt: dbPost.published_at,
      engagementScore: dbPost.engagement_score,
      engagementSuggestions: dbPost.engagement_suggestions,
      postType: dbPost.post_type,
      // These fields are stored in content JSONB
      generatedImage: dbPost.content?.generatedImage,
      carouselImages: dbPost.content?.carouselImages,
      generatedVideoUrl: dbPost.content?.generatedVideoUrl,
      isGeneratingImage: dbPost.content?.isGeneratingImage || false,
      isGeneratingVideo: dbPost.content?.isGeneratingVideo || false,
      videoGenerationStatus: dbPost.content?.videoGenerationStatus,
      videoOperation: dbPost.content?.videoOperation,
      imageMetadata: dbPost.content?.imageMetadata,
      generatedImageTimestamp: dbPost.content?.generatedImageTimestamp,
      imageGenerationProgress: dbPost.content?.imageGenerationProgress,
    }
  }

  /**
   * Transform Post type to database format
   */
  static transformToDB(post: Post, userId: string, workspaceId: string): any {
    // Extract fields that go into content JSONB
    const { 
      generatedImage, 
      carouselImages,
      generatedVideoUrl, 
      isGeneratingImage, 
      isGeneratingVideo, 
      videoGenerationStatus, 
      videoOperation,
      imageMetadata,
      generatedImageTimestamp,
      imageGenerationProgress,
      content, 
      ...rest 
    } = post

    return {
      id: post.id,
      workspace_id: workspaceId,
      created_by: userId,
      topic: post.topic,
      post_type: post.postType || (carouselImages && carouselImages.length > 0 ? 'carousel' : 'post'),
      platforms: post.platforms,
      content: {
        ...content,
        generatedImage,
        carouselImages,
        generatedVideoUrl,
        isGeneratingImage,
        isGeneratingVideo,
        videoGenerationStatus,
        videoOperation,
        imageMetadata,
        generatedImageTimestamp,
        imageGenerationProgress,
      },
      status: post.status,
      scheduled_at: post.scheduledAt,
      published_at: post.publishedAt,
      engagement_score: post.engagementScore,
      engagement_suggestions: post.engagementSuggestions,
      is_carousel: carouselImages && carouselImages.length > 0,
      carousel_slide_count: carouselImages?.length || null,
    }
  }

  /**
   * Log activity to activity_logs table
   */
  private static async logActivity(
    workspaceId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: any = {}
  ): Promise<void> {
    try {
      const supabase = await getSupabase()
      await (supabase.from('activity_logs') as any).insert({
        workspace_id: workspaceId,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details || null,
      })
    } catch (error) {
      // Don't throw - activity logging shouldn't break the main operation
    }
  }
}
