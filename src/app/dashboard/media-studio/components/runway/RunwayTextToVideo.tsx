'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Clock } from 'lucide-react';
import type { GeneratedRunwayVideo, RunwayRatio, RunwayDuration } from '../../types/mediaStudio.types';
import { RUNWAY_RATIO_OPTIONS, RUNWAY_DURATION_OPTIONS, RUNWAY_PLATFORM_PRESETS } from '../../types/mediaStudio.types';

// ============================================================================
// Types
// ============================================================================

interface RunwayTextToVideoProps {
    onGenerationStarted: (video: GeneratedRunwayVideo, historyAction: string) => void;
    onError: (error: string) => void;
    isGenerating: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RunwayTextToVideo({
    onGenerationStarted,
    onError,
    isGenerating,
}: RunwayTextToVideoProps) {
    // State
    const [prompt, setPrompt] = useState('');
    const [ratio, setRatio] = useState<RunwayRatio>('1280:720');
    const [duration, setDuration] = useState<RunwayDuration>(8);
    const [audio, setAudio] = useState(false);

    // Get aspect ratio for display
    const selectedRatio = RUNWAY_RATIO_OPTIONS.find(r => r.value === ratio);

    // Apply platform preset
    const applyPreset = (presetId: string) => {
        const preset = RUNWAY_PLATFORM_PRESETS.find(p => p.id === presetId);
        if (preset) {
            setRatio(preset.ratio as RunwayRatio);
            setDuration(preset.duration as RunwayDuration);
        }
    };

    // Handle generate
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            onError('Please enter a prompt');
            return;
        }

        try {
            const response = await fetch('/api/ai/media/runway/text-to-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    model: 'veo3.1',
                    ratio,
                    duration,
                    audio,
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
                    model: 'veo3.1',
                    ratio,
                    duration,
                    audio,
                    generation_mode: 'text',
                },
            };

            onGenerationStarted(video, 'runway-text-to-video');
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to generate video');
        }
    };

    return (
        <div className="space-y-5">
            {/* Prompt */}
            <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground">
                    Video Prompt
                </label>
                <Textarea
                    placeholder="Describe your video in detail: subjects, camera movement, lighting, style, mood..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="min-h-[160px] resize-none text-[14px] leading-relaxed p-3.5 rounded-lg"
                    maxLength={1000}
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Be specific about motion, camera angles, and scene details</span>
                    <span>{prompt.length}/1000</span>
                </div>
            </div>

            {/* Settings Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Ratio */}
                <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">Aspect Ratio</label>
                    <Select value={ratio} onValueChange={(v) => setRatio(v as RunwayRatio)} disabled={isGenerating}>
                        <SelectTrigger className="h-9 text-[13px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RUNWAY_RATIO_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                                    {opt.label}
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
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--ms-border)] bg-muted/30">
                <div className="flex items-center gap-2">
                    <Label htmlFor="audio-toggle" className="text-[13px] font-medium cursor-pointer">
                        Generate Audio
                    </Label>
                    <span className="text-[11px] text-muted-foreground">(AI-generated soundtrack)</span>
                </div>
                <Switch
                    id="audio-toggle"
                    checked={audio}
                    onCheckedChange={setAudio}
                    disabled={isGenerating}
                />
            </div>

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-11 text-[13px] font-medium"
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Video
                    </>
                )}
            </Button>

            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Estimated time: 2-4 minutes</span>
            </div>
        </div>
    );
}

export default RunwayTextToVideo;
