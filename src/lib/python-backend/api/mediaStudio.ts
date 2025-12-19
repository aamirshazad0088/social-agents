/**
 * Media Studio API
 * 
 * API client for media processing operations including image resizing,
 * video resizing, video merging, audio processing, and media library management.
 */

import { get, post, patch, del } from '../client';
import { ENDPOINTS } from '../config';
import type {
    ImageResizeRequest,
    ImageResizeResponse,
    VideoResizeRequest,
    VideoResizeResponse,
    VideoMergeRequest,
    VideoMergeResponse,
    AudioProcessRequest,
    AudioProcessResponse,
    MediaLibraryItem,
    MediaLibraryFilters,
    CreateMediaItemRequest,
    UpdateMediaItemRequest,
    PlatformPreset,
    PaginatedResponse,
} from '../types';

// =============================================================================
// IMAGE OPERATIONS
// =============================================================================

/**
 * Get available image resize presets
 * 
 * Retrieves platform-specific image dimension presets.
 * 
 * @returns Promise resolving to array of presets
 */
export async function getImagePresets(): Promise<{
    presets: PlatformPreset[];
}> {
    return get(ENDPOINTS.mediaStudio.resizeImage);
}

/**
 * Resize image for a platform
 * 
 * Resizes an image to match platform-specific dimensions or custom size.
 * 
 * @param request - Resize request with image URL and target dimensions
 * @returns Promise resolving to resize result with new URL
 */
export async function resizeImage(
    request: ImageResizeRequest
): Promise<ImageResizeResponse> {
    return post<ImageResizeResponse>(
        ENDPOINTS.mediaStudio.resizeImage,
        request
    );
}

// =============================================================================
// VIDEO OPERATIONS
// =============================================================================

/**
 * Get available video resize presets
 * 
 * Retrieves platform-specific video dimension presets.
 * 
 * @returns Promise resolving to array of presets
 */
export async function getVideoPresets(): Promise<{
    presets: PlatformPreset[];
}> {
    return get(ENDPOINTS.mediaStudio.resizeVideo);
}

/**
 * Resize video for a platform
 * 
 * Resizes a video to match platform-specific dimensions or custom size.
 * 
 * @param request - Resize request with video URL and target dimensions
 * @returns Promise resolving to resize result with new URL
 */
export async function resizeVideo(
    request: VideoResizeRequest
): Promise<VideoResizeResponse> {
    return post<VideoResizeResponse>(
        ENDPOINTS.mediaStudio.resizeVideo,
        request
    );
}

/**
 * Merge multiple videos
 * 
 * Combines multiple video clips into a single video file.
 * Maximum total duration: 5 minutes.
 * 
 * @param request - Merge request with video URLs and config
 * @returns Promise resolving to merged video result
 */
export async function mergeVideos(
    request: VideoMergeRequest
): Promise<VideoMergeResponse> {
    return post<VideoMergeResponse>(
        ENDPOINTS.mediaStudio.mergeVideos,
        request
    );
}

// =============================================================================
// AUDIO OPERATIONS
// =============================================================================

/**
 * Process video audio
 * 
 * Processes video audio including muting, adding background music,
 * and adjusting volume levels.
 * 
 * @param request - Audio processing request
 * @returns Promise resolving to processed video result
 */
export async function processAudio(
    request: AudioProcessRequest
): Promise<AudioProcessResponse> {
    return post<AudioProcessResponse>(
        ENDPOINTS.mediaStudio.processAudio,
        request
    );
}

// =============================================================================
// MEDIA LIBRARY
// =============================================================================

/**
 * Get media library items
 * 
 * Retrieves media items with optional filtering and pagination.
 * 
 * @param workspaceId - Workspace ID
 * @param filters - Optional filters for type, source, tags, etc.
 * @returns Promise resolving to paginated media items
 */
export async function getMediaLibrary(
    workspaceId: string,
    filters?: MediaLibraryFilters
): Promise<PaginatedResponse<MediaLibraryItem>> {
    return get<PaginatedResponse<MediaLibraryItem>>(
        ENDPOINTS.mediaStudio.library,
        {
            params: {
                workspace_id: workspaceId,
                ...filters,
                tags: filters?.tags?.join(','),
            },
        }
    );
}

/**
 * Create a media library item
 * 
 * Adds a new item to the media library.
 * 
 * @param request - Create request with media item data
 * @returns Promise resolving to created item
 */
export async function createMediaItem(
    request: CreateMediaItemRequest
): Promise<{ success: boolean; data: MediaLibraryItem }> {
    return post(ENDPOINTS.mediaStudio.library, request);
}

/**
 * Update a media library item
 * 
 * Updates an existing media library item.
 * 
 * @param request - Update request with item ID and updates
 * @returns Promise resolving to updated item
 */
export async function updateMediaItem(
    request: UpdateMediaItemRequest
): Promise<{ success: boolean; data: MediaLibraryItem }> {
    return patch(ENDPOINTS.mediaStudio.library, request);
}

/**
 * Delete a media library item
 * 
 * Removes an item from the media library and storage.
 * 
 * @param workspaceId - Workspace ID
 * @param mediaId - Media item ID to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteMediaItem(
    workspaceId: string,
    mediaId: string
): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(ENDPOINTS.mediaStudio.library, {
        params: {
            workspace_id: workspaceId,
            media_id: mediaId,
        },
    });
}

/**
 * Toggle favorite status
 * 
 * Marks or unmarks a media item as favorite.
 * 
 * @param workspaceId - Workspace ID
 * @param mediaId - Media item ID
 * @param isFavorite - New favorite status
 * @returns Promise resolving to updated item
 */
export async function toggleFavorite(
    workspaceId: string,
    mediaId: string,
    isFavorite: boolean
): Promise<{ success: boolean; data: MediaLibraryItem }> {
    return patch(ENDPOINTS.mediaStudio.library, {
        workspaceId,
        mediaId,
        updates: { is_favorite: isFavorite },
    });
}

/**
 * Move item to folder
 * 
 * Moves a media item to a specified folder.
 * 
 * @param workspaceId - Workspace ID
 * @param mediaId - Media item ID
 * @param folder - Target folder path
 * @returns Promise resolving to updated item
 */
export async function moveToFolder(
    workspaceId: string,
    mediaId: string,
    folder: string
): Promise<{ success: boolean; data: MediaLibraryItem }> {
    return patch(ENDPOINTS.mediaStudio.library, {
        workspaceId,
        mediaId,
        updates: { folder },
    });
}

/**
 * Add tags to media item
 * 
 * Adds tags to a media item for organization.
 * 
 * @param workspaceId - Workspace ID
 * @param mediaId - Media item ID
 * @param tags - Tags to add
 * @returns Promise resolving to updated item
 */
export async function addTags(
    workspaceId: string,
    mediaId: string,
    tags: string[]
): Promise<{ success: boolean; data: MediaLibraryItem }> {
    return patch(ENDPOINTS.mediaStudio.library, {
        workspaceId,
        mediaId,
        updates: { tags },
    });
}

// =============================================================================
// SERVICE INFO
// =============================================================================

/**
 * Get Media Studio service info
 * 
 * Retrieves information about the media studio service.
 * 
 * @returns Promise resolving to service info
 */
export async function getMediaStudioInfo(): Promise<{
    service: string;
    version: string;
    endpoints: Record<string, Record<string, string>>;
    platform_presets: {
        image: number;
        video: number;
    };
}> {
    return get(ENDPOINTS.mediaStudio.base);
}
