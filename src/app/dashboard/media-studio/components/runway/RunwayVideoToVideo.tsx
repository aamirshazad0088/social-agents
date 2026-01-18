'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Clock, Upload, Wand2, ArrowUpCircle, X, Video, RefreshCw, ChevronLeft, ImageIcon } from 'lucide-react';
import type { GeneratedRunwayVideo, RunwayRatio } from '../../types/mediaStudio.types';
import { RUNWAY_RATIO_OPTIONS } from '../../types/mediaStudio.types';

// ============================================================================
// Types
// ============================================================================

interface LibraryVideo {
    id: string;
    url: string;
    prompt?: string;
    thumbnail_url?: string;
}

interface LibraryImage {
    id: string;
    url: string;
    prompt?: string;
    thumbnail_url?: string;
}

interface RunwayVideoToVideoProps {
    onGenerationStarted: (video: GeneratedRunwayVideo, historyAction: string) => void;
    onError: (error: string) => void;
    isGenerating: boolean;
    recentVideos: GeneratedRunwayVideo[];
    workspaceId?: string;
    isUpscaleMode?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RunwayVideoToVideo({
    onGenerationStarted,
    onError,
    isGenerating,
    recentVideos,
    workspaceId,
    isUpscaleMode = false,
}: RunwayVideoToVideoProps) {
    // State
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [videoSource, setVideoSource] = useState<'upload' | 'library' | null>(null);
    const [referenceImageUrl, setReferenceImageUrl] = useState('');
    const [referenceImageSource, setReferenceImageSource] = useState<'upload' | 'library' | null>(null);
    const [ratio, setRatio] = useState<RunwayRatio>('1280:720');
    const [seed, setSeed] = useState<string>('');

    // Library picker state for videos
    const [showVideoLibraryPicker, setShowVideoLibraryPicker] = useState(false);
    const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
    const [isLoadingVideoLibrary, setIsLoadingVideoLibrary] = useState(false);

    // Library picker state for reference images
    const [showImageLibraryPicker, setShowImageLibraryPicker] = useState(false);
    const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
    const [isLoadingImageLibrary, setIsLoadingImageLibrary] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Fetch library videos
    const fetchLibraryVideos = useCallback(async () => {
        if (!workspaceId) return;

        setIsLoadingVideoLibrary(true);
        try {
            const response = await fetch(`/api/media-studio/library?workspace_id=${workspaceId}&type=video&limit=20`);
            const data = await response.json();
            if (data.items) {
                setLibraryVideos(data.items);
            }
        } catch (err) {
            console.error('Failed to fetch library videos:', err);
        } finally {
            setIsLoadingVideoLibrary(false);
        }
    }, [workspaceId]);

    // Fetch library images
    const fetchLibraryImages = useCallback(async () => {
        if (!workspaceId) return;

        setIsLoadingImageLibrary(true);
        try {
            const response = await fetch(`/api/media-studio/library?workspace_id=${workspaceId}&type=image&limit=20`);
            const data = await response.json();
            if (data.items) {
                setLibraryImages(data.items);
            }
        } catch (err) {
            console.error('Failed to fetch library images:', err);
        } finally {
            setIsLoadingImageLibrary(false);
        }
    }, [workspaceId]);

    // Load libraries when pickers are opened
    useEffect(() => {
        if (showVideoLibraryPicker) {
            fetchLibraryVideos();
        }
    }, [showVideoLibraryPicker, fetchLibraryVideos]);

    useEffect(() => {
        if (showImageLibraryPicker) {
            fetchLibraryImages();
        }
    }, [showImageLibraryPicker, fetchLibraryImages]);

    // Handle video file upload
    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setVideoUrl(dataUrl);
                setVideoPreview(dataUrl);
                setVideoSource('upload');
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle reference image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setReferenceImageUrl(dataUrl);
                setReferenceImageSource('upload');
            };
            reader.readAsDataURL(file);
        }
    };

    // Select video from library
    const handleSelectVideoFromLibrary = (url: string) => {
        setVideoUrl(url);
        setVideoPreview(url);
        setVideoSource('library');
        setShowVideoLibraryPicker(false);
    };

    // Select image from library
    const handleSelectImageFromLibrary = (url: string) => {
        setReferenceImageUrl(url);
        setReferenceImageSource('library');
        setShowImageLibraryPicker(false);
    };

    // Clear video
    const clearVideo = () => {
        setVideoUrl('');
        setVideoPreview(null);
        setVideoSource(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Clear reference image
    const clearReferenceImage = () => {
        setReferenceImageUrl('');
        setReferenceImageSource(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    // Handle generate
    const handleGenerate = async () => {
        if (!videoUrl) {
            onError('Please upload or select a video');
            return;
        }
        if (!isUpscaleMode && !prompt.trim()) {
            onError('Please enter a prompt');
            return;
        }

        try {
            const endpoint = isUpscaleMode
                ? '/api/ai/media/runway/upscale'
                : '/api/ai/media/runway/video-to-video';

            const body = isUpscaleMode
                ? {
                    model: 'upscale_v1',  // Required by Runway API
                    videoUri: videoUrl
                }
                : {
                    prompt: prompt.trim(),
                    videoUri: videoUrl,
                    model: 'gen4_aleph',
                    ratio,
                    seed: seed ? parseInt(seed) : undefined,
                    referenceImageUri: referenceImageUrl || undefined,
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to start video generation');
            }

            const video: GeneratedRunwayVideo = {
                id: data.taskId,
                prompt: isUpscaleMode ? 'Video upscale' : prompt.trim(),
                status: 'PENDING',
                progress: 0,
                createdAt: Date.now(),
                taskId: data.taskId,
                config: {
                    prompt: isUpscaleMode ? 'upscale' : prompt.trim(),
                    model: isUpscaleMode ? 'upscale_v1' : 'gen4_aleph',
                    ratio,
                    duration: 10,
                    videoUri: videoUrl,
                    referenceImageUri: referenceImageUrl || undefined,
                    seed: seed ? parseInt(seed) : undefined,
                    generation_mode: isUpscaleMode ? 'upscale' : 'video',
                },
            };

            onGenerationStarted(video, isUpscaleMode ? 'runway-upscale' : 'runway-video-to-video');
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to process video');
        }
    };

    return (
        <div className="space-y-5">
            {/* Video Upload Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <label className="text-[13px] font-medium text-foreground">
                    {isUpscaleMode ? 'Video to Upscale' : 'Source Video'}
                </label>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="hidden"
                    disabled={isGenerating}
                />

                {/* Show selected video or picker */}
                {videoPreview ? (
                    <div className="space-y-2">
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                            <video src={videoPreview} className="w-full h-full object-contain" controls />
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={clearVideo}
                                disabled={isGenerating}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-green-500">✓</span>
                            <span>{videoSource === 'upload' ? 'Uploaded video' : 'From library'} - Ready for {isUpscaleMode ? 'upscaling' : 'transformation'}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowVideoLibraryPicker(true)}
                            disabled={isGenerating}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Change Video
                        </Button>
                    </div>
                ) : showVideoLibraryPicker ? (
                    /* Video Library Picker View */
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowVideoLibraryPicker(false)}
                                className="h-8 px-2"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <span className="text-sm font-medium">Select from Library</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchLibraryVideos}
                                className="h-8 px-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoadingVideoLibrary ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {isLoadingVideoLibrary ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : libraryVideos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                                {libraryVideos.map((item) => (
                                    <button
                                        key={item.id}
                                        className="aspect-video bg-muted rounded-md overflow-hidden transition-all hover:ring-2 hover:ring-cyan-500"
                                        onClick={() => handleSelectVideoFromLibrary(item.url)}
                                    >
                                        <video src={item.url} className="w-full h-full object-cover" muted />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No videos in library</p>
                                <p className="text-xs">Generate some videos first</p>
                            </div>
                        )}

                        {/* Upload button in library picker */}
                        <div className="pt-2 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isGenerating}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload from PC
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Initial Selection - Opens library */
                    <Button
                        variant="outline"
                        className="w-full h-24 border-dashed flex items-center justify-center"
                        onClick={() => setShowVideoLibraryPicker(true)}
                        disabled={isGenerating}
                    >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                    </Button>
                )}
            </div>

            {/* Prompt (not for upscale) */}
            {!isUpscaleMode && (
                <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">
                        Transformation Prompt
                    </label>
                    <Textarea
                        placeholder="Describe how to transform the video (e.g., 'Make it look like a watercolor painting with soft brush strokes')"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                        className="min-h-[140px] resize-none text-[14px] leading-relaxed p-3.5 rounded-lg"
                        maxLength={1000}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Describe the visual transformation you want</span>
                        <span>{prompt.length}/1000</span>
                    </div>
                </div>
            )}

            {/* Reference Image (for style transfer) */}
            {!isUpscaleMode && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                        <label className="text-[13px] font-medium text-foreground">Reference Image (Optional)</label>
                        {referenceImageUrl && (
                            <button
                                onClick={clearReferenceImage}
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {/* Hidden file input for images */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isGenerating}
                    />

                    {referenceImageUrl ? (
                        <div className="space-y-2">
                            <div className="relative w-24 h-24">
                                <img
                                    src={referenceImageUrl}
                                    alt="Reference"
                                    className="w-full h-full object-cover rounded-md border border-[var(--ms-border)]"
                                />
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                    onClick={clearReferenceImage}
                                    disabled={isGenerating}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="text-green-500">✓</span>
                                <span>{referenceImageSource === 'upload' ? 'Uploaded' : 'From library'} - Style reference</span>
                            </div>
                        </div>
                    ) : showImageLibraryPicker ? (
                        /* Image Library Picker View */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowImageLibraryPicker(false)}
                                    className="h-8 px-2"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Back
                                </Button>
                                <span className="text-sm font-medium">Select Reference</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchLibraryImages}
                                    className="h-8 px-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingImageLibrary ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>

                            {isLoadingImageLibrary ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : libraryImages.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                                    {libraryImages.map((item) => (
                                        <button
                                            key={item.id}
                                            className="aspect-square bg-muted rounded-md overflow-hidden transition-all hover:ring-2 hover:ring-cyan-500"
                                            onClick={() => handleSelectImageFromLibrary(item.url)}
                                        >
                                            <img src={item.url} alt={item.prompt || 'Library image'} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No images in library</p>
                                    <p className="text-xs">Generate some images first</p>
                                </div>
                            )}

                            {/* Upload button */}
                            <div className="pt-2 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isGenerating}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload from PC
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full h-16 border-dashed flex items-center justify-center gap-2"
                            onClick={() => setShowImageLibraryPicker(true)}
                            disabled={isGenerating}
                        >
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[12px] text-muted-foreground">Add style reference</span>
                        </Button>
                    )}
                </div>
            )}

            {/* Settings Row (for style transfer) */}
            {!isUpscaleMode && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[13px] font-medium text-foreground">Output Ratio</label>
                        <Select value={ratio} onValueChange={(v) => setRatio(v as RunwayRatio)} disabled={isGenerating}>
                            <SelectTrigger className="h-9 text-[13px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RUNWAY_RATIO_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                                        {opt.aspect}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[13px] font-medium text-foreground">Seed</label>
                        <Input
                            type="number"
                            placeholder="Random"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            disabled={isGenerating}
                            className="h-9 text-[13px]"
                        />
                    </div>
                </div>
            )}

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={isGenerating || !videoUrl || (!isUpscaleMode && !prompt.trim())}
                className="w-full h-11 text-[13px] font-medium"
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUpscaleMode ? 'Upscaling...' : 'Transforming...'}
                    </>
                ) : (
                    <>
                        {isUpscaleMode ? (
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                        ) : (
                            <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        {isUpscaleMode ? 'Upscale Video' : 'Transform Video'}
                    </>
                )}
            </Button>

            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Estimated time: {isUpscaleMode ? '1-2' : '2-3'} minutes</span>
            </div>
        </div>
    );
}

export default RunwayVideoToVideo;
