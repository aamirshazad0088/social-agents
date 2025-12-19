'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Media types supported by the library
 */
export type MediaType = 'image' | 'video' | 'audio';

/**
 * Source/action types for media generation
 */
export type MediaSource =
  | 'generated'      // Text-to-image or text-to-video
  | 'edited'         // Smart edit or Canva edited
  | 'uploaded'       // User uploaded media
  | 'variation'      // DALL-E 2 variations
  | 'reference'      // Style reference generation
  | 'image-to-video' // Image animated to video
  | 'remix'          // Video remix
  | 'inpaint'        // Inpainting edit
  // Google Veo 3.1 sources
  | 'veo-text'           // Veo text-to-video
  | 'veo-image'          // Veo image-to-video
  | 'veo-extend'         // Veo video extension
  | 'veo-frame-specific' // Veo first+last frame
  | 'veo-reference';     // Veo reference images

export interface SaveMediaOptions {
  type: MediaType;
  source: MediaSource;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  revisedPrompt?: string;
  model: string;
  config: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface SaveHistoryOptions {
  type: MediaType;
  action: MediaSource;
  prompt: string;
  model: string;
  config: Record<string, any>;
  inputMediaUrls?: string[];
}

export interface UpdateHistoryOptions {
  historyId: string;
  status: 'completed' | 'failed';
  outputMediaUrl?: string;
  outputMediaId?: string;
  generationTimeMs?: number;
  revisedPrompt?: string;
  errorMessage?: string;
}

/**
 * Hook for saving generated media to the database
 * Automatically handles workspace context
 */
export function useMediaLibrary() {
  const { workspaceId } = useAuth();

  /**
   * Save generated media to the library
   */
  const saveMedia = useCallback(async (options: SaveMediaOptions): Promise<string | null> => {
    if (!workspaceId) {
      return null;
    }

    try {
      const response = await fetch('/api/media-studio/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          mediaItem: {
            type: options.type,
            source: options.source,
            url: options.url,
            thumbnailUrl: options.thumbnailUrl,
            prompt: options.prompt,
            revisedPrompt: options.revisedPrompt,
            model: options.model,
            config: options.config,
            metadata: options.metadata,
            tags: options.tags,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save media');
      }

      const result = await response.json();
      return result.data?.id || null;
    } catch (error) {
      return null;
    }
  }, [workspaceId]);

  /**
   * Create a history entry when generation starts
   */
  const createHistoryEntry = useCallback(async (options: SaveHistoryOptions): Promise<string | null> => {
    if (!workspaceId) {
      return null;
    }

    try {
      const response = await fetch('/api/media-studio/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          historyEntry: {
            type: options.type,
            action: options.action,
            prompt: options.prompt,
            model: options.model,
            config: options.config,
            inputMediaUrls: options.inputMediaUrls,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create history');
      }

      const result = await response.json();
      return result.data?.id || null;
    } catch (error) {
      return null;
    }
  }, [workspaceId]);

  /**
   * Update history entry on completion or failure
   */
  const updateHistoryEntry = useCallback(async (options: UpdateHistoryOptions): Promise<boolean> => {
    if (!workspaceId) {
      return false;
    }

    try {
      const response = await fetch('/api/media-studio/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          historyId: options.historyId,
          updates: {
            status: options.status,
            outputMediaUrl: options.outputMediaUrl,
            outputMediaId: options.outputMediaId,
            generationTimeMs: options.generationTimeMs,
            revisedPrompt: options.revisedPrompt,
            errorMessage: options.errorMessage,
          },
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }, [workspaceId]);

  /**
   * Save media and update history in one call
   * Use this for the complete flow after successful generation
   */
  const saveGeneratedMedia = useCallback(async (
    mediaOptions: SaveMediaOptions,
    historyId?: string | null,
    generationTimeMs?: number
  ): Promise<{ mediaId: string | null; success: boolean }> => {
    const startTime = Date.now();

    // Save media to library
    const mediaId = await saveMedia(mediaOptions);

    // Update history if we have a history entry
    if (historyId && mediaId) {
      await updateHistoryEntry({
        historyId,
        status: 'completed',
        outputMediaUrl: mediaOptions.url,
        outputMediaId: mediaId,
        generationTimeMs: generationTimeMs || (Date.now() - startTime),
        revisedPrompt: mediaOptions.revisedPrompt,
      });
    }

    return { mediaId, success: !!mediaId };
  }, [saveMedia, updateHistoryEntry]);

  /**
   * Mark a generation as failed
   */
  const markGenerationFailed = useCallback(async (
    historyId: string | null,
    errorMessage: string
  ): Promise<void> => {
    if (historyId) {
      await updateHistoryEntry({
        historyId,
        status: 'failed',
        errorMessage,
      });
    }
  }, [updateHistoryEntry]);

  return {
    workspaceId,
    saveMedia,
    createHistoryEntry,
    updateHistoryEntry,
    saveGeneratedMedia,
    markGenerationFailed,
    isEnabled: !!workspaceId,
  };
}

export default useMediaLibrary;
