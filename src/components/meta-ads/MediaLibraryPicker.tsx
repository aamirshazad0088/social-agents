'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Video,
  Search,
  X,
  Check,
  Grid,
  List,
  Heart,
  Loader2,
  RefreshCw,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Plus,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMedia, MediaItem } from '@/contexts/MediaContext';
import { useAuth } from '@/contexts/AuthContext';
import { AudioWaveform } from '@/components/ui/audio-waveform';

interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: SelectedMedia | SelectedMedia[]) => void;
  mediaType?: 'image' | 'video' | 'audio' | 'all';
  multiple?: boolean;
  maxItems?: number;
  title?: string;
  description?: string;
}

export interface SelectedMedia {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'videos' | 'audio' | 'favorites';

export default function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  mediaType = 'all',
  multiple = false,
  maxItems = 10,
  title = 'Select Media',
  description = 'Choose media from your library',
}: MediaLibraryPickerProps) {
  const { workspaceId } = useAuth();
  const {
    mediaItems,
    loading,
    refreshMedia,
    setFilters,
  } = useMedia();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>(
    mediaType === 'image' ? 'images' : mediaType === 'video' ? 'videos' : mediaType === 'audio' ? 'audio' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Update context filters when local filter changes
  useEffect(() => {
    if (open) {
      setFilters({
        type: filterType === 'images' ? 'image' : filterType === 'videos' ? 'video' : filterType === 'audio' ? 'audio' : undefined,
        isFavorite: filterType === 'favorites' ? true : undefined,
        search: searchQuery || undefined,
      });
    }
  }, [filterType, searchQuery, setFilters, open]);

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedItems([]);
      setPreviewItem(null);
    }
  }, [open]);

  // Filter items based on mediaType prop
  const filteredItems = useMemo(() => {
    let items = mediaItems || [];

    // Apply mediaType filter from props
    if (mediaType === 'image') {
      items = items.filter(item => item.type === 'image');
    } else if (mediaType === 'video') {
      items = items.filter(item => item.type === 'video');
    } else if (mediaType === 'audio') {
      items = items.filter(item => item.type === 'audio');
    }

    return items;
  }, [mediaItems, mediaType]);

  const toggleItemSelection = (item: MediaItem) => {
    if (multiple) {
      setSelectedItems(prev => {
        const isSelected = prev.some(i => i.id === item.id);
        if (isSelected) {
          return prev.filter(i => i.id !== item.id);
        } else if (prev.length < maxItems) {
          return [...prev, item];
        }
        return prev;
      });
    } else {
      setSelectedItems([item]);
    }
  };

  const isItemSelected = (itemId: string) => selectedItems.some(i => i.id === itemId);

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;

    const selectedMedia: SelectedMedia[] = selectedItems.map(item => ({
      id: item.id,
      url: item.url,
      type: item.type,
      thumbnailUrl: item.thumbnail_url,
    }));

    if (multiple) {
      onSelect(selectedMedia);
    } else {
      onSelect(selectedMedia[0]);
    }
    onOpenChange(false);
  };

  const handlePreview = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewItem(item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b flex flex-wrap items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filter */}
          {mediaType === 'all' && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['all', 'images', 'videos', 'audio', 'favorites'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm capitalize transition-colors flex items-center gap-1",
                    filterType === type
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setFilterType(type)}
                >
                  {type === 'favorites' && <Heart className="w-3 h-3" />}
                  {type === 'audio' && <Music className="w-3 h-3" />}
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMedia()}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>

          {/* View Mode */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Media Grid/List */}
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No media found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? 'No items match your search'
                    : 'Generate or upload media in Media Studio first'
                  }
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const selected = isItemSelected(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                        "hover:ring-2 hover:ring-primary/50",
                        selected && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => toggleItemSelection(item)}
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.thumbnail_url || item.url}
                          alt={item.prompt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : item.type === 'audio' ? (
                        <div className="relative w-full h-full bg-muted flex items-center justify-center p-4">
                          <AudioWaveform isPlaying={false} barCount={15} className="text-muted-foreground/50" />
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Music className="w-3 h-3" />
                            Audio
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-muted">
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            onMouseEnter={(e) => {
                              const video = e.target as HTMLVideoElement;
                              video.play().catch(() => { });
                            }}
                            onMouseLeave={(e) => {
                              const video = e.target as HTMLVideoElement;
                              video.pause();
                              video.currentTime = 0;
                            }}
                          />
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Video
                          </div>
                        </div>
                      )}

                      {/* Selection indicator */}
                      <div className={cn(
                        "absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-white/90 border-gray-300 opacity-0 group-hover:opacity-100"
                      )}>
                        {selected && <Check className="w-4 h-4" />}
                      </div>

                      {/* Selection order for multiple */}
                      {multiple && selected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {selectedItems.findIndex(i => i.id === item.id) + 1}
                        </div>
                      )}

                      {/* Favorite indicator */}
                      {item.is_favorite && (
                        <div className="absolute bottom-2 left-2">
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const selected = isItemSelected(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all",
                        "hover:bg-muted/50",
                        selected && "border-primary bg-primary/5"
                      )}
                      onClick={() => toggleItemSelection(item)}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                        {item.type === 'image' ? (
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.prompt}
                            className="w-full h-full object-cover"
                          />
                        ) : item.type === 'audio' ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Music className="w-6 h-6 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <Video className="absolute bottom-1 right-1 w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.prompt}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          {item.is_favorite && (
                            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                          )}
                        </div>
                      </div>

                      {/* Selection */}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                        selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-gray-300"
                      )}>
                        {selected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Preview Panel (when item is selected for preview) */}
          {
            previewItem && (
              <div className="w-80 border-l p-4 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Preview</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewItem(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                  {previewItem.type === 'image' ? (
                    <img
                      src={previewItem.url}
                      alt={previewItem.prompt}
                      className="w-full h-full object-contain"
                    />
                  ) : previewItem.type === 'audio' ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted relative p-4">
                      <AudioWaveform isPlaying={true} barCount={30} />
                      <audio src={previewItem.url} autoPlay controls className="absolute bottom-2 left-2 right-2 w-[calc(100%-16px)] z-10" />
                    </div>
                  ) : (
                    <video
                      src={previewItem.url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      muted
                    />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {previewItem.prompt}
                </p>
              </div>
            )
          }
        </div >

        {/* Footer */}
        < div className="px-6 py-4 border-t flex items-center justify-between shrink-0 bg-muted/30" >
          <div className="text-sm text-muted-foreground">
            {selectedItems.length > 0 ? (
              <span>
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                {multiple && maxItems && ` (max ${maxItems})`}
              </span>
            ) : (
              <span>
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {multiple ? `Select ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}` : 'Select'}
            </Button>
          </div>
        </div >
      </DialogContent >
    </Dialog >
  );
}
