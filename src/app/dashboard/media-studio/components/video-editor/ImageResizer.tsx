'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Image as ImageIcon,
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

// Platform icons mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'youtube-thumbnail':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'instagram-story':
    case 'instagram-post':
    case 'instagram-feed':
      return <Instagram className="w-5 h-5 text-pink-500" />;
    case 'facebook-story':
    case 'facebook-post-square':
    case 'facebook-feed':
    case 'facebook-cover':
      return <Facebook className="w-5 h-5 text-blue-600" />;
    case 'twitter-header':
      return <Twitter className="w-5 h-5 text-sky-500" />;
    case 'linkedin-square':
    case 'linkedin-cover':
      return <Linkedin className="w-5 h-5 text-blue-700" />;
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

interface ImageItem {
  id: string;
  url: string;
  thumbnail_url?: string;
  prompt?: string;
}

interface ImageResizerProps {
  onResizeComplete: (imageUrl: string) => void;
}

export function ImageResizer({ onResizeComplete }: ImageResizerProps) {
  const { workspaceId } = useAuth();
  const [presets, setPresets] = useState<PlatformPreset[]>([]);
  const [libraryImages, setLibraryImages] = useState<ImageItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    fetchPresets();
    if (workspaceId) {
      fetchLibraryImages();
    }
  }, [workspaceId]);

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/media-studio/resize-image');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    }
  };

  const fetchLibraryImages = async () => {
    if (!workspaceId) return;
    setIsLoadingLibrary(true);
    try {
      const response = await fetch(
        `/api/media-studio/library?workspace_id=${workspaceId}&type=image&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setLibraryImages(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleResize = async () => {
    if (!selectedImage || !selectedPlatform) {
      toast.error('Please select an image and platform');
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
      const response = await fetch('/api/media-studio/resize-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          imageUrl: selectedImage.url,
          platform: selectedPlatform,
        }),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        const data = await response.json();
        toast.success(`Image resized for ${data.platform}!`);

        // Reset state
        setSelectedImage(null);
        setSelectedPlatform(null);

        // Refresh library and notify parent
        await fetchLibraryImages();
        onResizeComplete(data.url);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resize image');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to resize image');
    } finally {
      setIsResizing(false);
    }
  };

  // Group presets by category
  const storyPresets = presets.filter(p =>
    ['instagram-story', 'facebook-story'].includes(p.id)
  );
  const squarePresets = presets.filter(p =>
    ['instagram-post', 'facebook-post-square', 'linkedin-square'].includes(p.id)
  );
  const portraitPresets = presets.filter(p =>
    ['instagram-feed', 'facebook-feed'].includes(p.id)
  );
  const landscapePresets = presets.filter(p =>
    ['youtube-thumbnail', 'facebook-cover', 'twitter-header', 'linkedin-cover'].includes(p.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Image Selection */}
      <Card className="flex flex-col h-full overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <ImageIcon className="w-5 h-5 text-white" />
            Select Image
          </CardTitle>
          <CardDescription className="text-teal-50">
            Choose an image to resize
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLibrary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : libraryImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No images in library</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {libraryImages.map((item) => {
                const isSelected = selectedImage?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-sm ${isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/50 scale-[0.98]'
                      : 'border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                      }`}
                    onClick={() => setSelectedImage(isSelected ? null : item)}
                  >
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.prompt || 'Image'}
                      className="aspect-square object-cover w-full"
                    />

                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <Badge className="bg-indigo-500">
                          <Check className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Middle: Platform Selection */}
      <Card className="flex flex-col h-full overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Crop className="w-5 h-5 text-white" />
            Select Platform
          </CardTitle>
          <CardDescription className="text-teal-50">
            Choose the target size
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[450px] overflow-y-auto">
          {/* Stories (9:16) */}
          {storyPresets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-medium">Stories (9:16)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {storyPresets.map((preset) => (
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
          )}

          {/* Square (1:1) */}
          {squarePresets.length > 0 && (
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
          )}

          {/* Portrait (4:5) */}
          {portraitPresets.length > 0 && (
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
          )}

          {/* Landscape */}
          {landscapePresets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">Landscape / Covers</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {landscapePresets.map((preset) => (
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
          )}

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
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            onClick={handleResize}
            disabled={!selectedImage || !selectedPlatform || isResizing}
          >
            {isResizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resizing...
              </>
            ) : (
              <>
                <Crop className="w-4 h-4 mr-2" />
                Resize Image
              </>
            )}
          </Button>

          {(!selectedImage || !selectedPlatform) && (
            <p className="text-xs text-muted-foreground text-center">
              Select an image and platform to resize
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
