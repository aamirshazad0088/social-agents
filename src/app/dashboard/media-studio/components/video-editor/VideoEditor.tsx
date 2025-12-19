'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Film,
  Music,
  Merge,
  Crop,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { VideoItem } from './types';
import { VideoMerger } from './VideoMerger';
import { AudioMixer } from './AudioMixer';
import { VideoResizer } from './VideoResizer';
import { ImageResizer } from './ImageResizer';

interface VideoEditorProps {
  onVideoProcessed?: (videoUrl: string) => void;
}

export function VideoEditor({ onVideoProcessed }: VideoEditorProps) {
  const { workspaceId } = useAuth();
  const [activeTab, setActiveTab] = useState<'merge' | 'audio' | 'resize' | 'image'>('merge');
  const [libraryVideos, setLibraryVideos] = useState<VideoItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      fetchLibraryVideos();
    }
  }, [workspaceId]);

  const fetchLibraryVideos = async () => {
    if (!workspaceId) return;
    setIsLoadingLibrary(true);
    try {
      const response = await fetch(
        `/api/media-studio/library?workspace_id=${workspaceId}&type=video&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];

        // Map database MediaItem to VideoItem, ensuring duration is available
        const videoItems: VideoItem[] = items.map((item: any) => ({
          ...item,
          // Extract duration from metadata if available at top level or nested
          duration: item.duration || item.metadata?.duration || item.metadata?.video?.duration || 0
        }));

        setLibraryVideos(videoItems);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleProcessComplete = async (videoUrl: string) => {
    // Refresh library to show new video
    await fetchLibraryVideos();

    // Notify parent
    if (onVideoProcessed) {
      onVideoProcessed(videoUrl);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'merge' | 'audio' | 'resize' | 'image')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="merge" className="gap-2">
            <Merge className="w-4 h-4" />
            Merge
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2">
            <Music className="w-4 h-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="resize" className="gap-2">
            <Crop className="w-4 h-4" />
            Video Resize
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Image Resize
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merge" className="mt-4">
          <VideoMerger
            libraryVideos={libraryVideos}
            isLoadingLibrary={isLoadingLibrary}
            onMergeComplete={handleProcessComplete}
          />
        </TabsContent>

        <TabsContent value="audio" className="mt-4">
          <AudioMixer
            libraryVideos={libraryVideos}
            isLoadingLibrary={isLoadingLibrary}
            onProcessComplete={handleProcessComplete}
          />
        </TabsContent>

        <TabsContent value="resize" className="mt-4">
          <VideoResizer
            libraryVideos={libraryVideos}
            isLoadingLibrary={isLoadingLibrary}
            onResizeComplete={handleProcessComplete}
          />
        </TabsContent>

        <TabsContent value="image" className="mt-4">
          <ImageResizer
            onResizeComplete={handleProcessComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
