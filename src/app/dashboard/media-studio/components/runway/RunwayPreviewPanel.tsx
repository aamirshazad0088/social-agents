'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Video,
    Download,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    PlayCircle,
} from 'lucide-react';
import type { GeneratedRunwayVideo } from '../../types/mediaStudio.types';

// ============================================================================
// Types
// ============================================================================

interface RunwayPreviewPanelProps {
    currentVideo: GeneratedRunwayVideo | null;
    isGenerating: boolean;
    recentVideos: GeneratedRunwayVideo[];
    onSelectVideo: (video: GeneratedRunwayVideo) => void;
    onNewVideo: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusIcon(status: string) {
    switch (status) {
        case 'SUCCEEDED':
            return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case 'FAILED':
            return <XCircle className="w-4 h-4 text-red-500" />;
        case 'RUNNING':
            return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />;
        default:
            return <Clock className="w-4 h-4 text-amber-500" />;
    }
}

function getStatusBadge(status: string) {
    const colors = {
        SUCCEEDED: 'bg-green-500/10 text-green-600 border-green-500/20',
        FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
        RUNNING: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };

    return colors[status as keyof typeof colors] || colors.PENDING;
}

// ============================================================================
// Component
// ============================================================================

export function RunwayPreviewPanel({
    currentVideo,
    isGenerating,
    recentVideos,
    onSelectVideo,
    onNewVideo,
}: RunwayPreviewPanelProps) {
    // Download video
    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `runway-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    return (
        <Card className="overflow-hidden border rounded-xl lg:col-span-2">
            <CardHeader className="p-5 pb-4" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)', borderBottom: '1px solid var(--ms-border)' }}>
                <CardTitle className="flex items-center gap-2 text-[15px]">
                    <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
                        <PlayCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="ms-heading-md">Preview</span>
                </CardTitle>
                <CardDescription className="ms-body-sm">
                    Video preview and generation progress
                </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-6 space-y-5">
                {/* Current Video Preview */}
                <div className="aspect-[1/1] bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden relative border-2 border-dashed border-muted-foreground/20">
                    {currentVideo?.url ? (
                        <video
                            src={currentVideo.url}
                            className="w-full h-full object-contain bg-black"
                            controls
                            autoPlay
                            loop
                        />
                    ) : currentVideo ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                            {currentVideo.status === 'RUNNING' || currentVideo.status === 'PENDING' ? (
                                <>
                                    <div className="relative mb-2">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 blur-xl opacity-50 animate-pulse" />
                                        <Loader2 className="w-16 h-16 text-cyan-500 animate-spin relative" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-muted-foreground">Generating video...</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            {currentVideo.progress ? `${Math.round(currentVideo.progress)}%` : 'This may take a few minutes'}
                                        </p>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-48 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                            style={{ width: `${currentVideo.progress || 5}%` }}
                                        />
                                    </div>
                                </>
                            ) : currentVideo.status === 'FAILED' ? (
                                <>
                                    <XCircle className="w-12 h-12 text-red-500" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">Generation Failed</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">{currentVideo.error || 'Please try again'}</p>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="p-6 rounded-full bg-gradient-to-br from-muted-foreground/5 to-muted-foreground/10 mb-4">
                                <Video className="w-12 h-12 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No video generated yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1 text-center px-8">Write a prompt and click generate to create your first video</p>
                        </div>
                    )}
                </div>

                {/* Video Actions */}
                {currentVideo?.url && currentVideo.status === 'SUCCEEDED' && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(currentVideo.url!)}
                            className="flex-1 h-9 text-[12px]"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download
                        </Button>
                    </div>
                )}

                {/* Current Video Info */}
                {currentVideo && (
                    <div className="p-3 rounded-lg border border-[var(--ms-border)] bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] ${getStatusBadge(currentVideo.status)}`}>
                                {getStatusIcon(currentVideo.status)}
                                <span className="ml-1">{currentVideo.status}</span>
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                                {new Date(currentVideo.createdAt).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-[12px] text-foreground line-clamp-2">{currentVideo.prompt}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>{currentVideo.config.model}</span>
                            <span>•</span>
                            <span>{currentVideo.config.ratio}</span>
                            <span>•</span>
                            <span>{currentVideo.config.duration}s</span>
                        </div>
                    </div>
                )}

                {/* Recent Videos */}
                {recentVideos.length > 0 && (
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[13px] font-medium text-foreground">Recent Videos</label>
                            <span className="text-[11px] text-muted-foreground">{recentVideos.length} videos</span>
                        </div>
                        <ScrollArea className="h-[200px]">
                            <div className="space-y-2 pr-3">
                                {recentVideos.map((video) => (
                                    <button
                                        key={video.id}
                                        onClick={() => onSelectVideo(video)}
                                        className={`w-full p-2.5 rounded-lg border text-left transition-all ${currentVideo?.id === video.id
                                            ? 'border-cyan-500 bg-cyan-500/5'
                                            : 'border-[var(--ms-border)] hover:border-cyan-500/50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {/* Thumbnail */}
                                            <div className="w-16 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                                                {video.url ? (
                                                    <video src={video.url} className="w-full h-full object-cover" muted />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {getStatusIcon(video.status)}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-foreground line-clamp-1">{video.prompt}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getStatusIcon(video.status)}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(video.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default RunwayPreviewPanel;
