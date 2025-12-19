/**
 * Media Library Service - Supabase Database Operations
 * Handles all CRUD operations for AI-generated media (images & videos)
 */

import { createServerClient } from '@/lib/supabase/server'

let supabaseInstance: any = null

async function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = await createServerClient()
  }
  return supabaseInstance
}

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio'
export type MediaSource = 
  | 'generated' 
  | 'edited' 
  | 'uploaded'
  | 'variation' 
  | 'reference' 
  | 'image-to-video' 
  | 'remix' 
  | 'inpaint'
  // Google Veo 3.1 sources
  | 'veo-text'
  | 'veo-image'
  | 'veo-extend'
  | 'veo-frame-specific'
  | 'veo-reference'

export interface MediaItem {
  id: string
  workspace_id: string
  user_id: string
  type: MediaType
  source: MediaSource
  url: string
  thumbnail_url?: string
  prompt: string
  revised_prompt?: string
  model: string
  config: Record<string, any>
  metadata?: Record<string, any>
  is_favorite: boolean
  tags: string[]
  folder?: string
  created_at: string
  updated_at: string
}

export interface CreateMediaItemInput {
  type: MediaType
  source: MediaSource
  url: string
  thumbnailUrl?: string
  prompt: string
  revisedPrompt?: string
  model: string
  config: Record<string, any>
  metadata?: Record<string, any>
  tags?: string[]
  folder?: string
}

export interface UpdateMediaItemInput {
  isFavorite?: boolean
  tags?: string[]
  folder?: string
}

export interface MediaLibraryFilters {
  type?: MediaType
  source?: MediaSource
  isFavorite?: boolean
  folder?: string
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
}

// ============================================================================
// Service Class
// ============================================================================

export class MediaLibraryService {
  /**
   * Create a new media item in the library
   */
  static async createMediaItem(
    input: CreateMediaItemInput,
    userId: string,
    workspaceId: string
  ): Promise<MediaItem> {
    try {
      const supabase = await getSupabase()

      const mediaItem = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        type: input.type,
        source: input.source,
        url: input.url,
        thumbnail_url: input.thumbnailUrl || null,
        prompt: input.prompt,
        revised_prompt: input.revisedPrompt || null,
        model: input.model,
        config: input.config,
        metadata: input.metadata || {},
        is_favorite: false,
        tags: input.tags || [],
        folder: input.folder || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await (supabase
        .from('media_library') as any)
        .insert([mediaItem])
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity(workspaceId, userId, 'create', 'media', data.id, {
        type: input.type,
        source: input.source,
        model: input.model,
      })

      return data as MediaItem
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all media items for a workspace with filters
   */
  static async getMediaItems(
    workspaceId: string,
    filters: MediaLibraryFilters = {}
  ): Promise<{ items: MediaItem[]; total: number }> {
    try {
      const supabase = await getSupabase()
      const { limit = 50, offset = 0, type, source, isFavorite, folder, tags, search } = filters

      // Build count query
      let countQuery = supabase
        .from('media_library')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      // Build data query
      let dataQuery = supabase
        .from('media_library')
        .select('*')
        .eq('workspace_id', workspaceId)

      // Apply filters
      if (type) {
        countQuery = countQuery.eq('type', type)
        dataQuery = dataQuery.eq('type', type)
      }
      if (source) {
        countQuery = countQuery.eq('source', source)
        dataQuery = dataQuery.eq('source', source)
      }
      if (isFavorite !== undefined) {
        countQuery = countQuery.eq('is_favorite', isFavorite)
        dataQuery = dataQuery.eq('is_favorite', isFavorite)
      }
      if (folder) {
        countQuery = countQuery.eq('folder', folder)
        dataQuery = dataQuery.eq('folder', folder)
      }
      if (tags && tags.length > 0) {
        countQuery = countQuery.contains('tags', tags)
        dataQuery = dataQuery.contains('tags', tags)
      }
      if (search) {
        countQuery = countQuery.ilike('prompt', `%${search}%`)
        dataQuery = dataQuery.ilike('prompt', `%${search}%`)
      }

      const { count } = await countQuery
      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        items: (data || []) as MediaItem[],
        total: count || 0,
      }
    } catch (error) {
      return { items: [], total: 0 }
    }
  }

  /**
   * Get a single media item by ID
   */
  static async getMediaItemById(
    mediaId: string,
    workspaceId: string
  ): Promise<MediaItem | null> {
    try {
      const supabase = await getSupabase()

      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('id', mediaId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error

      return data as MediaItem
    } catch (error) {
      return null
    }
  }

  /**
   * Update a media item
   */
  static async updateMediaItem(
    mediaId: string,
    updates: UpdateMediaItemInput,
    userId: string,
    workspaceId: string
  ): Promise<MediaItem> {
    try {
      const supabase = await getSupabase()

      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.isFavorite !== undefined) {
        updateData.is_favorite = updates.isFavorite
      }
      if (updates.tags !== undefined) {
        updateData.tags = updates.tags
      }
      if (updates.folder !== undefined) {
        updateData.folder = updates.folder
      }

      const { data, error } = await (supabase
        .from('media_library') as any)
        .update(updateData)
        .eq('id', mediaId)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity(workspaceId, userId, 'update', 'media', mediaId, updates)

      return data as MediaItem
    } catch (error) {
      throw error
    }
  }

  /**
   * Delete a media item
   */
  static async deleteMediaItem(
    mediaId: string,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      const supabase = await getSupabase()

      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', mediaId)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      await this.logActivity(workspaceId, userId, 'delete', 'media', mediaId)
    } catch (error) {
      throw error
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(
    mediaId: string,
    userId: string,
    workspaceId: string
  ): Promise<MediaItem> {
    const item = await this.getMediaItemById(mediaId, workspaceId)
    if (!item) throw new Error('Media item not found')

    return this.updateMediaItem(
      mediaId,
      { isFavorite: !item.is_favorite },
      userId,
      workspaceId
    )
  }

  /**
   * Get recent media items
   */
  static async getRecentMedia(
    workspaceId: string,
    limit: number = 10
  ): Promise<MediaItem[]> {
    const { items } = await this.getMediaItems(workspaceId, { limit })
    return items
  }

  /**
   * Get media items by type
   */
  static async getMediaByType(
    workspaceId: string,
    type: MediaType,
    limit: number = 50
  ): Promise<MediaItem[]> {
    const { items } = await this.getMediaItems(workspaceId, { type, limit })
    return items
  }

  /**
   * Get favorite media items
   */
  static async getFavorites(
    workspaceId: string,
    limit: number = 50
  ): Promise<MediaItem[]> {
    const { items } = await this.getMediaItems(workspaceId, { isFavorite: true, limit })
    return items
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
    }
  }
}

// Export default for convenience
export default MediaLibraryService
