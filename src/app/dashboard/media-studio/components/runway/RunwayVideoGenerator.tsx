'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Video,
    Sparkles,
    Image as ImageIcon,
    Wand2,
    ArrowUpCircle,
} from 'lucide-react';
import { RunwayTextToVideo } from './RunwayTextToVideo';
import { RunwayImageToVideo } from './RunwayImageToVideo';
import { RunwayVideoToVideo } from './RunwayVideoToVideo';
import { RunwayPreviewPanel } from './RunwayPreviewPanel';
import type { GeneratedRunwayVideo, GeneratedImage } from '../../types/mediaStudio.types';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';

// ============================================================================
// Types
// ============================================================================

export type RunwayMode = 'text' | 'image' | 'video' | 'upscale';

interface RunwayVideoGeneratorProps {
    onVideoStarted: (video: GeneratedRunwayVideo) => void;
    onVideoUpdate: (videoId: string, updates: Partial<GeneratedRunwayVideo>) => void;
    recentVideos: GeneratedRunwayVideo[];
    recentImages: GeneratedImage[];
}

// ============================================================================
// Mode Configuration
// ============================================================================

const RUNWAY_MODES: { id: RunwayMode; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'text', label: 'Text', icon: <Sparkles className="w-4 h-4" />, description: 'From prompt' },
    { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" />, description: 'First frame' },
    { id: 'video', label: 'Style', icon: <Wand2 className="w-4 h-4" />, description: 'Transform' },
    { id: 'upscale', label: 'Upscale', icon: <ArrowUpCircle className="w-4 h-4" />, description: 'Enhance' },
];

// ============================================================================
// Component
// ============================================================================

export function RunwayVideoGenerator({
    onVideoStarted,
    onVideoUpdate,
    recentVideos,
    recentImages,
}: RunwayVideoGeneratorProps) {
    const { saveGeneratedMedia, createHistoryEntry, markGenerationFailed, isEnabled: canSaveToDb, workspaceId } = useMediaLibrary();

    // State
    const [mode, setMode] = useState<RunwayMode>('text');
    const [currentVideo, setCurrentVideo] = useState<GeneratedRunwayVideo | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const [generationStartTime, setGenerationStartTime] = useState<number>(0);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Poll task status
    const pollTaskStatus = useCallback(async (taskId: string) => {
        try {
            const response = await fetch('/api/ai/media/runway/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const status = data.data.status;
                const progress = data.data.progress || 0;

                if (status === 'SUCCEEDED') {
                    const videoUrl = data.videoUrl || (data.data.output && data.data.output[0]);

                    onVideoUpdate(taskId, {
                        status: 'SUCCEEDED',
                        url: videoUrl,
                        progress: 100,
                    });

                    setCurrentVideo(prev => prev ? {
                        ...prev,
                        status: 'SUCCEEDED',
                        url: videoUrl,
                        progress: 100,
                    } : null);

                    // Save to database
                    if (canSaveToDb && videoUrl && currentVideo) {
                        const genTime = generationStartTime > 0 ? Date.now() - generationStartTime : undefined;

                        try {
                            console.log('Saving Runway video to database...', { url: videoUrl.substring(0, 50) + '...' });
                            const result = await saveGeneratedMedia({
                                type: 'video',
                                source: `runway-${mode}` as any,
                                url: videoUrl,
                                prompt: currentVideo.prompt,
                                model: currentVideo.config.model,
                                config: currentVideo.config,
                            }, currentHistoryId, genTime);
                            console.log('Runway video saved to database:', result);
                        } catch (err) {
                            console.error('Failed to save Runway video to database:', err);
                        }
                    }

                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    setIsGenerating(false);
                    setCurrentHistoryId(null);
                } else if (status === 'FAILED') {
                    const errorMsg = data.data.failure || 'Video generation failed';

                    onVideoUpdate(taskId, { status: 'FAILED', progress: 0, error: errorMsg });
                    setError(errorMsg);

                    if (currentHistoryId) {
                        await markGenerationFailed(currentHistoryId, errorMsg);
                    }

                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    setIsGenerating(false);
                    setCurrentHistoryId(null);
                } else {
                    // Still processing (PENDING or RUNNING)
                    onVideoUpdate(taskId, {
                        status: status,
                        progress: progress,
                    });
                    setCurrentVideo(prev => prev ? {
                        ...prev,
                        status: status,
                        progress: progress,
                    } : null);
                }
            }
        } catch (err) {
            console.error('Polling error:', err);
        }
    }, [onVideoUpdate, canSaveToDb, currentVideo, currentHistoryId, generationStartTime, markGenerationFailed, mode, saveGeneratedMedia]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Handle generation started from child components
    const handleGenerationStarted = useCallback(async (
        video: GeneratedRunwayVideo,
        historyAction: string
    ) => {
        setIsGenerating(true);
        setError(null);
        setGenerationStartTime(Date.now());
        setCurrentVideo(video);
        onVideoStarted(video);

        // Create history entry
        const historyId = canSaveToDb ? await createHistoryEntry({
            type: 'video',
            action: historyAction as any,
            prompt: video.prompt,
            model: video.config.model,
            config: video.config,
        }) : null;
        setCurrentHistoryId(historyId);

        // Start polling every 5 seconds (Runway recommends not more frequent than every 5s)
        if (video.taskId) {
            pollIntervalRef.current = setInterval(() => {
                pollTaskStatus(video.taskId!);
            }, 5000);
        }
    }, [canSaveToDb, createHistoryEntry, onVideoStarted, pollTaskStatus]);

    // Handle generation error from child components
    const handleGenerationError = useCallback(async (errorMsg: string) => {
        setError(errorMsg);
        setIsGenerating(false);

        if (currentHistoryId) {
            await markGenerationFailed(currentHistoryId, errorMsg);
        }
        setCurrentHistoryId(null);
    }, [currentHistoryId, markGenerationFailed]);

    // Handle new video
    const handleNewVideo = useCallback(() => {
        setCurrentVideo(null);
        setIsGenerating(false);
        setError(null);
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Configuration Panel */}
            <Card className="border rounded-xl lg:col-span-3">
                <CardHeader className="p-5 pb-4">
                    <CardTitle className="flex items-center gap-3 text-[15px]">
                        <div className="p-2.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
                            <Video className="w-[18px] h-[18px] text-white" />
                        </div>
                        <span className="font-semibold">Runway Gen-4</span>
                    </CardTitle>
                    <CardDescription className="text-[13px] flex items-center gap-2 mt-1">
                        AI Video Generation with Style Transfer
                        <Badge variant="secondary" className="text-[10px] flex items-center gap-1 h-5 px-2">
                            <Wand2 className="w-3 h-3" />
                            Gen4
                        </Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-5">
                    {/* Generation Mode Tabs */}
                    <div className="space-y-2.5">
                        <label className="text-[13px] font-medium text-foreground">Generation Mode</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {RUNWAY_MODES.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    disabled={isGenerating}
                                    className={`h-11 px-1.5 rounded-lg border text-center transition-all ${mode === m.id
                                        ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 ring-1 ring-cyan-500 shadow-sm'
                                        : 'border-[var(--ms-border)] hover:border-cyan-500/50'
                                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex justify-center mb-0.5">{m.icon}</div>
                                    <div className="font-medium text-[10px] text-foreground leading-tight">{m.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode-specific content */}
                    {mode === 'text' && (
                        <RunwayTextToVideo
                            onGenerationStarted={handleGenerationStarted}
                            onError={handleGenerationError}
                            isGenerating={isGenerating}
                        />
                    )}

                    {mode === 'image' && (
                        <RunwayImageToVideo
                            onGenerationStarted={handleGenerationStarted}
                            onError={handleGenerationError}
                            isGenerating={isGenerating}
                            recentImages={recentImages}
                            workspaceId={workspaceId ?? undefined}
                        />
                    )}

                    {mode === 'video' && (
                        <RunwayVideoToVideo
                            onGenerationStarted={handleGenerationStarted}
                            onError={handleGenerationError}
                            isGenerating={isGenerating}
                            recentVideos={recentVideos}
                            workspaceId={workspaceId ?? undefined}
                        />
                    )}

                    {mode === 'upscale' && (
                        <RunwayVideoToVideo
                            onGenerationStarted={handleGenerationStarted}
                            onError={handleGenerationError}
                            isGenerating={isGenerating}
                            recentVideos={recentVideos}
                            workspaceId={workspaceId ?? undefined}
                            isUpscaleMode={true}
                        />
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Preview Panel */}
            <RunwayPreviewPanel
                currentVideo={currentVideo}
                isGenerating={isGenerating}
                recentVideos={recentVideos}
                onSelectVideo={setCurrentVideo}
                onNewVideo={handleNewVideo}
            />
        </div>
    );
}

export default RunwayVideoGenerator;
