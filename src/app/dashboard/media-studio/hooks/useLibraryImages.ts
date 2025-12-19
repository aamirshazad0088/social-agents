'use client';

import { useState, useCallback, useEffect } from 'react';

export interface LibraryImage {
  id: string;
  url: string;
  prompt?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

interface UseLibraryImagesOptions {
  workspaceId?: string | null;
  autoFetch?: boolean;
  limit?: number;
}

interface UseLibraryImagesReturn {
  libraryImages: LibraryImage[];
  isLoading: boolean;
  error: string | null;
  fetchImages: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching images from the media library
 * Used by both GPT and Veo video generators for image selection
 */
export function useLibraryImages({
  workspaceId,
  autoFetch = false,
  limit = 20,
}: UseLibraryImagesOptions = {}): UseLibraryImagesReturn {
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!workspaceId) {
      setError('No workspace ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/media-studio/library?workspace_id=${workspaceId}&type=image&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch library images');
      }

      const data = await response.json();
      
      if (data.items) {
        setLibraryImages(data.items.map((item: any) => ({
          id: item.id,
          url: item.url,
          prompt: item.prompt,
          thumbnailUrl: item.thumbnail_url,
          createdAt: item.created_at,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch images');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, limit]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && workspaceId) {
      fetchImages();
    }
  }, [autoFetch, workspaceId, fetchImages]);

  return {
    libraryImages,
    isLoading,
    error,
    fetchImages,
    refetch: fetchImages,
  };
}

export default useLibraryImages;

