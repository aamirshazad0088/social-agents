'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Clock, Upload, ImageIcon, X, FolderOpen, RefreshCw, ChevronLeft } from 'lucide-react';
import type { GeneratedRunwayVideo, GeneratedImage, RunwayRatio, RunwayDuration } from '../../types/mediaStudio.types';
import { RUNWAY_RATIO_OPTIONS, RUNWAY_DURATION_OPTIONS } from '../../types/mediaStudio.types';

// ============================================================================
// Types
// ============================================================================

interface LibraryImage {
    id: string;
    url: string;
    prompt?: string;
    thumbnail_url?: string;
}

interface RunwayImageToVideoProps {
    onGenerationStarted: (video: GeneratedRunwayVideo, historyAction: string) => void;
    onError: (error: string) => void;
    isGenerating: boolean;
    recentImages: GeneratedImage[];
    workspaceId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function RunwayImageToVideo({
    onGenerationStarted,
    onError,
    isGenerating,
    recentImages,
    workspaceId,
}: RunwayImageToVideoProps) {
    // State
    const [prompt, setPrompt] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageSource, setImageSource] = useState<'upload' | 'library' | null>(null);
    const [ratio, setRatio] = useState<RunwayRatio>('1280:720');
    const [duration, setDuration] = useState<RunwayDuration>(10);
    const [seed, setSeed] = useState<string>('');

    // Library picker state
    const [showLibraryPicker, setShowLibraryPicker] = useState(false);
    const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch library images
    const fetchLibraryImages = useCallback(async () => {
        if (!workspaceId) return;

        setIsLoadingLibrary(true);
        try {
            const response = await fetch(`/api/media-studio/library?workspace_id=${workspaceId}&type=image&limit=20`);
            const data = await response.json();
            if (data.items) {
                setLibraryImages(data.items);
            }
        } catch (err) {
            console.error('Failed to fetch library images:', err);
        } finally {
            setIsLoadingLibrary(false);
        }
    }, [workspaceId]);

    // Load library when picker is opened
    useEffect(() => {
        if (showLibraryPicker) {
            fetchLibraryImages();
        }
    }, [showLibraryPicker, fetchLibraryImages]);

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setImageUrl(dataUrl);
                setImagePreview(dataUrl);
                setImageSource('upload');
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle library image selection
    const handleSelectFromLibrary = (url: string) => {
        setImageUrl(url);
        setImagePreview(url);
        setImageSource('library');
        setShowLibraryPicker(false);
    };

    // Clear image
    const clearImage = () => {
        setImageUrl('');
        setImagePreview(null);
        setImageSource(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle generate
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            onError('Please enter a prompt');
            return;
        }
        if (!imageUrl) {
            onError('Please upload or select an image');
            return;
        }

        try {
            const response = await fetch('/api/ai/media/runway/image-to-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    // Use official API array format (promptImages)
                    promptImages: [{ uri: imageUrl, position: 'first' }],
                    model: 'gen4_turbo',
                    ratio,
                    duration,
                    seed: seed ? parseInt(seed) : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to start video generation');
            }

            const video: GeneratedRunwayVideo = {
                id: data.taskId,
                prompt: prompt.trim(),
                status: 'PENDING',
                progress: 0,
                createdAt: Date.now(),
                taskId: data.taskId,
                config: {
                    prompt: prompt.trim(),
                    model: 'gen4_turbo',
                    ratio,
                    duration,
                    promptImages: [{ uri: imageUrl, position: 'first' }],
                    seed: seed ? parseInt(seed) : undefined,
                    generation_mode: 'image',
                },
            };

            onGenerationStarted(video, 'runway-image-to-video');
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to generate video');
        }
    };

    return (
        <div className="space-y-5">
            {/* Image Upload Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <label className="text-[13px] font-medium text-foreground">First Frame Image</label>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isGenerating}
                />

                {/* Show selected image or picker */}
                {imagePreview ? (
                    <div className="space-y-2">
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                            <img src={imagePreview} alt="Selected" className="w-full h-full object-contain" />
                            <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={clearImage}
                                disabled={isGenerating}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-green-500">✓</span>
                            <span>{imageSource === 'upload' ? 'Uploaded image' : 'From library'} - Will be used as first frame</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowLibraryPicker(true)}
                            disabled={isGenerating}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Change Image
                        </Button>
                    </div>
                ) : showLibraryPicker ? (
                    /* Library Picker View */
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowLibraryPicker(false)}
                                className="h-8 px-2"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <span className="text-sm font-medium">Select from Library</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchLibraryImages}
                                className="h-8 px-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {isLoadingLibrary ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : libraryImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
                                {libraryImages.map((item) => (
                                    <button
                                        key={item.id}
                                        className="aspect-video bg-muted rounded-md overflow-hidden transition-all hover:ring-2 hover:ring-cyan-500"
                                        onClick={() => handleSelectFromLibrary(item.url)}
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
                                Upload New Image
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Initial Selection - Upload icon opens library */
                    <Button
                        variant="outline"
                        className="w-full h-24 border-dashed flex items-center justify-center"
                        onClick={() => setShowLibraryPicker(true)}
                        disabled={isGenerating}
                    >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                    </Button>
                )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">
                    Animation Prompt
                </label>
                <Textarea
                    placeholder="Describe how the image should animate (e.g., 'Camera slowly pans right as the subject turns and smiles')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="min-h-[140px] resize-none text-[14px] leading-relaxed p-3.5 rounded-lg"
                    maxLength={1000}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Describe motion, camera movement, and action</span>
                    <span>{prompt.length}/1000</span>
                </div>
            </div>

            {/* Settings Row */}
            <div className="grid grid-cols-3 gap-3">
                {/* Ratio */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">Ratio</label>
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

                {/* Duration */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">Duration</label>
                    <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v) as RunwayDuration)} disabled={isGenerating}>
                        <SelectTrigger className="h-9 text-[13px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RUNWAY_DURATION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value.toString()} className="text-[13px]">
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Seed */}
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

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || !imageUrl}
                className="w-full h-11 text-[13px] font-medium"
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Animating...
                    </>
                ) : (
                    <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Animate Image
                    </>
                )}
            </Button>

            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Estimated time: 1-2 minutes</span>
            </div>
        </div>
    );
}

export default RunwayImageToVideo;
