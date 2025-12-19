/**
 * API Route: Media Studio Library
 * CRUD operations for AI-generated media items
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { MediaLibraryService, CreateMediaItemInput, MediaLibraryFilters } from '@/services/database/mediaLibraryService'
import { uploadBase64Image } from '@/lib/supabase/storage'

/**
 * GET /api/media-studio/library
 * Fetch media items with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    // Build filters from query params
    const filters: MediaLibraryFilters = {
      type: searchParams.get('type') as any || undefined,
      source: searchParams.get('source') as any || undefined,
      isFavorite: searchParams.get('is_favorite') === 'true' ? true : undefined,
      folder: searchParams.get('folder') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    // Handle tags array
    const tagsParam = searchParams.get('tags')
    if (tagsParam) {
      filters.tags = tagsParam.split(',')
    }

    const result = await MediaLibraryService.getMediaItems(workspaceId, filters)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch media items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/media-studio/library
 * Create a new media item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, mediaItem } = body

    if (!workspaceId || !mediaItem) {
      return NextResponse.json(
        { error: 'workspaceId and mediaItem required' },
        { status: 400 }
      )
    }

    // Upload base64 image to storage if needed
    let finalUrl = mediaItem.url
    if (mediaItem.url && mediaItem.url.startsWith('data:')) {
      try {
        const filename = `media-${Date.now()}-${Math.random().toString(36).substring(7)}`
        finalUrl = await uploadBase64Image(mediaItem.url, filename)
      } catch (uploadError) {
        // Continue with base64 URL if upload fails
      }
    }

    const input: CreateMediaItemInput = {
      type: mediaItem.type,
      source: mediaItem.source,
      url: finalUrl,
      thumbnailUrl: mediaItem.thumbnailUrl,
      prompt: mediaItem.prompt,
      revisedPrompt: mediaItem.revisedPrompt,
      model: mediaItem.model,
      config: mediaItem.config || {},
      metadata: mediaItem.metadata,
      tags: mediaItem.tags,
      folder: mediaItem.folder,
    }


    const result = await MediaLibraryService.createMediaItem(input, user.id, workspaceId)
    

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create media item' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/media-studio/library
 * Update a media item (favorite, tags, folder)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, mediaId, updates } = body

    if (!workspaceId || !mediaId || !updates) {
      return NextResponse.json(
        { error: 'workspaceId, mediaId, and updates required' },
        { status: 400 }
      )
    }

    const result = await MediaLibraryService.updateMediaItem(
      mediaId,
      updates,
      user.id,
      workspaceId
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update media item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/media-studio/library
 * Delete a media item and its file from storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const mediaId = searchParams.get('media_id')

    if (!workspaceId || !mediaId) {
      return NextResponse.json(
        { error: 'workspace_id and media_id required' },
        { status: 400 }
      )
    }

    // First, get the media item to find the file URL
    const mediaItem = await MediaLibraryService.getMediaItemById(mediaId, workspaceId)
    
    if (mediaItem && mediaItem.url) {
      // Extract file path from Supabase storage URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/media/canva/...
      const urlMatch = mediaItem.url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
      if (urlMatch && urlMatch[1]) {
        const filePath = urlMatch[1]
        
        // Delete file from Supabase storage
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([filePath])
        
        if (storageError) {
          // Continue with database delete even if storage delete fails
        } else {
        }
      }
    }

    // Delete the database record
    await MediaLibraryService.deleteMediaItem(mediaId, user.id, workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete media item' },
      { status: 500 }
    )
  }
}
