'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Video,
  Smartphone,
  Monitor,
  Square,
  Check,
  Crop,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { VideoItem } from './types';

// Platform icons mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'youtube-short':
    case 'youtube':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'instagram-reel':
    case 'instagram-post':
    case 'instagram-story':
    case 'instagram-feed':
      return <Instagram className="w-5 h-5 text-pink-500" />;
    case 'facebook-reel':
    case 'facebook-post':
    case 'facebook-post-square':
    case 'facebook-feed':
      return <Facebook className="w-5 h-5 text-blue-600" />;
    case 'twitter':
    case 'twitter-portrait':
      return <Twitter className="w-5 h-5 text-sky-500" />;
    case 'linkedin':
    case 'linkedin-square':
      return <Linkedin className="w-5 h-5 text-blue-700" />;
    case 'tiktok':
      return <Smartphone className="w-5 h-5 text-black dark:text-white" />;
    default:
      return <Monitor className="w-5 h-5" />;
  }
};

interface PlatformPreset {
  id: string;
  width: number;
  height: number;
  aspectRatio: string;
  name: string;
}

interface VideoResizerProps {
  libraryVideos: VideoItem[];
  isLoadingLibrary: boolean;
  onResizeComplete: (videoUrl: string) => void;
}

export function VideoResizer({ libraryVideos, isLoadingLibrary, onResizeComplete }: VideoResizerProps) {
  const { workspaceId } = useAuth();
  const [presets, setPresets] = useState<PlatformPreset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/media-studio/resize-video');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const handleResize = async () => {
    if (!selectedVideo || !selectedPlatform) {
      toast.error('Please select a video and platform');
      return;
    }

    if (!workspaceId) {
      toast.error('No workspace selected');
      return;
    }

    setIsResizing(true);
    const preset = presets.find(p => p.id === selectedPlatform);
    const loadingToast = toast.loading(`Resizing for ${preset?.name || selectedPlatform}...`);

    try {
      const response = await fetch('/api/media-studio/resize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          videoUrl: selectedVideo.url,
          platform: selectedPlatform,
        }),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        const data = await response.json();
        toast.success(`Video resized for ${data.platform}!`);

        // Reset state
        setSelectedVideo(null);
        setSelectedPlatform(null);

        onResizeComplete(data.url);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resize video');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to resize video');
    } finally {
      setIsResizing(false);
    }
  };

  // Group presets by category
  const verticalPresets = presets.filter(p =>
    ['youtube-short', 'instagram-reel', 'instagram-story', 'tiktok', 'facebook-reel', 'twitter-portrait'].includes(p.id)
  );
  const horizontalPresets = presets.filter(p =>
    ['youtube', 'facebook-post', 'twitter', 'linkedin'].includes(p.id)
  );
  const squarePresets = presets.filter(p =>
    ['instagram-post', 'facebook-post-square', 'linkedin-square'].includes(p.id)
  );
  const portraitPresets = presets.filter(p =>
    ['instagram-feed', 'facebook-feed'].includes(p.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Video Selection */}
      <Card className="flex flex-col h-full overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Video className="w-5 h-5 text-white" />
            Select Video
          </CardTitle>
          <CardDescription className="text-teal-50">
            Choose a video to resize
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLibrary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : libraryVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No videos in library</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {libraryVideos.map((item) => {
                const isSelected = selectedVideo?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-sm ${isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/50 scale-[0.98]'
                      : 'border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                      }`}
                    onClick={() => setSelectedVideo(isSelected ? null : item)}
                  >
                    <div className="aspect-video bg-zinc-900 relative">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.prompt || 'Video'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                          onLoadedMetadata={(e) => {
                            (e.target as HTMLVideoElement).currentTime = 0.5;
                          }}
                        />
                      )}

                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <Badge className="bg-indigo-500">
                            <Check className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Middle: Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Select Platform
          </CardTitle>
          <CardDescription>
            Choose where you want to post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vertical (9:16) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">Vertical (9:16)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {verticalPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPlatform === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2 h-auto py-2"
                  onClick={() => setSelectedPlatform(preset.id)}
                >
                  <PlatformIcon platform={preset.id} />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Horizontal (16:9) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">Horizontal (16:9)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {horizontalPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPlatform === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2 h-auto py-2"
                  onClick={() => setSelectedPlatform(preset.id)}
                >
                  <PlatformIcon platform={preset.id} />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Square (1:1) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Square className="w-4 h-4" />
              <span className="text-sm font-medium">Square (1:1)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {squarePresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPlatform === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2 h-auto py-2"
                  onClick={() => setSelectedPlatform(preset.id)}
                >
                  <PlatformIcon platform={preset.id} />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Portrait (4:5, 2:3) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">Portrait (4:5)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {portraitPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPlatform === preset.id ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2 h-auto py-2"
                  onClick={() => setSelectedPlatform(preset.id)}
                >
                  <PlatformIcon platform={preset.id} />
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Selected info */}
          {selectedPlatform && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Output Size:</span>
                <Badge variant="secondary">
                  {presets.find(p => p.id === selectedPlatform)?.width} x{' '}
                  {presets.find(p => p.id === selectedPlatform)?.height}
                </Badge>
              </div>
            </div>
          )}

          {/* Resize button */}
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            onClick={handleResize}
            disabled={!selectedVideo || !selectedPlatform || isResizing}
          >
            {isResizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resizing...
              </>
            ) : (
              <>
                <Crop className="w-4 h-4 mr-2" />
                Resize Video
              </>
            )}
          </Button>

          {(!selectedVideo || !selectedPlatform) && (
            <p className="text-xs text-muted-foreground text-center">
              Select a video and platform to resize
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
