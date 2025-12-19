'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  source: string;
  url: string;
  thumbnail_url?: string;
  prompt: string;
  model: string;
  config: Record<string, any>;
  is_favorite: boolean;
  tags: string[];
  created_at: string;
}

interface MediaFilters {
  type?: 'image' | 'video' | 'audio';
  isFavorite?: boolean;
  search?: string;
}

interface MediaContextType {
  mediaItems: MediaItem[];
  loading: boolean;
  filters: MediaFilters;
  totalItems: number;
  setFilters: (filters: MediaFilters) => void;
  refreshMedia: () => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  addItem: (item: MediaItem) => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const { user, workspaceId } = useAuth();

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState<MediaFilters>({});
  const [totalItems, setTotalItems] = useState(0);

  // Refs for tracking data load status (like DashboardContext)
  const dataLoadedRef = useRef(false);
  const currentWorkspaceRef = useRef<string | null>(null);

  // Load media from database
  const loadMedia = useCallback(async (force = false) => {
    if (!user || !workspaceId) {
      return;
    }

    // Only load data once per workspace unless forced (same pattern as DashboardContext)
    if (!force && dataLoadedRef.current && currentWorkspaceRef.current === workspaceId) {
      return;
    }

    try {
      // Only show loading spinner on manual refresh, not initial load
      if (force) {
        setLoading(true);
      }

      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (filters.type) params.append('type', filters.type);
      if (filters.isFavorite) params.append('is_favorite', 'true');
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/media-studio/library?${params}`);

      if (!response.ok) throw new Error('Failed to load media');

      const data = await response.json();

      setMediaItems(data.items || []);
      setTotalItems(data.total || 0);

      dataLoadedRef.current = true;
      currentWorkspaceRef.current = workspaceId;
    } catch (error) {
    } finally {
      if (force) {
        setLoading(false);
      }
    }
  }, [user, workspaceId, filters]);

  // Initial load
  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  // Set filters and reload with new filters
  const setFilters = useCallback((newFilters: MediaFilters) => {
    setFiltersState(newFilters);
    // Reset data loaded flag when filters change to allow reload
    dataLoadedRef.current = false;
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!workspaceId) return;

    const item = mediaItems.find(i => i.id === itemId);
    if (!item) return;

    // Optimistic update
    setMediaItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, is_favorite: !i.is_favorite } : i)
    );

    try {
      const response = await fetch('/api/media-studio/library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          mediaId: itemId,
          updates: { isFavorite: !item.is_favorite },
        }),
      });

      if (!response.ok) {
        // Revert on error
        setMediaItems(prev =>
          prev.map(i => i.id === itemId ? { ...i, is_favorite: item.is_favorite } : i)
        );
      }
    } catch (error) {
      // Revert on error
      setMediaItems(prev =>
        prev.map(i => i.id === itemId ? { ...i, is_favorite: item.is_favorite } : i)
      );
    }
  }, [workspaceId, mediaItems]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    if (!workspaceId) return;

    const itemToDelete = mediaItems.find(i => i.id === itemId);

    // Optimistic update
    setMediaItems(prev => prev.filter(i => i.id !== itemId));
    setTotalItems(prev => prev - 1);

    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        media_id: itemId,
      });

      const response = await fetch(`/api/media-studio/library?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok && itemToDelete) {
        // Revert on error
        setMediaItems(prev => [itemToDelete, ...prev]);
        setTotalItems(prev => prev + 1);
      }
    } catch (error) {
      if (itemToDelete) {
        // Revert on error
        setMediaItems(prev => [itemToDelete, ...prev]);
        setTotalItems(prev => prev + 1);
      }
    }
  }, [workspaceId, mediaItems]);

  // Add new item (used after upload or generation)
  const addItem = useCallback((item: MediaItem) => {
    setMediaItems(prev => [item, ...prev]);
    setTotalItems(prev => prev + 1);
  }, []);

  const value = useMemo(() => ({
    mediaItems,
    loading,
    filters,
    totalItems,
    setFilters,
    refreshMedia: () => loadMedia(true),
    toggleFavorite,
    deleteItem,
    addItem,
  }), [
    mediaItems, loading, filters, totalItems,
    setFilters, loadMedia, toggleFavorite, deleteItem, addItem
  ]);

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (context === undefined) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
}
