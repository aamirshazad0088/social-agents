'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  RefreshCw,
  Info,
  Video,
  Clock,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  AlertCircle,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { AI_MODELS, DEFAULT_AI_MODEL_ID, getModelDisplayName } from '@/constants/aiModels';
import {
  VEO_MODEL_OPTIONS,
  VEO_EXTENSION_SECONDS,
  VEO_MAX_EXTENSIONS,
  type VeoModel,
  type GeneratedVeoVideo,
} from '../../types/mediaStudio.types';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface StoredVeoVideo {
  id: string;
  url: string;
  prompt: string;
  config: {
    veo_video_id?: string;
    extension_count?: number;
    total_duration?: number;
    aspectRatio?: string;
    duration?: number;
    model?: string;
  };
  thumbnail_url?: string;
  created_at: string;
}

interface VeoVideoExtensionProps {
  onGenerationStarted: (video: GeneratedVeoVideo, historyAction: string) => void;
  onError: (error: string) => void;
  isGenerating: boolean;
  extendableVideos: GeneratedVeoVideo[];
}

// ============================================================================
// Component
// ============================================================================

export function VeoVideoExtension({
  onGenerationStarted,
  onError,
  isGenerating,
  extendableVideos,
}: VeoVideoExtensionProps) {
  const { workspaceId } = useAuth();

  // State
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VeoModel>('veo-3.1-generate-preview');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Prompt improvement state
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const [improvementInstructions, setImprovementInstructions] = useState('');
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [improvementError, setImprovementError] = useState<string | null>(null);
  const [selectedAIModelId, setSelectedAIModelId] = useState(DEFAULT_AI_MODEL_ID);
  const [showAIModelDropdown, setShowAIModelDropdown] = useState(false);

  const getUserFriendlyError = (error: unknown): string => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API_KEY') || errorMessage.includes('401')) return 'API key not configured.';
    if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('quota')) return 'Rate limit exceeded. Try a different model.';
    return 'Failed to improve prompt. Please try again.';
  };

  // Database videos state
  const [storedVideos, setStoredVideos] = useState<StoredVeoVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [showStoredVideos, setShowStoredVideos] = useState(false);

  // Fetch Veo videos from database
  const fetchStoredVideos = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoadingVideos(true);
    try {
      // Fetch videos with veo sources that have veo_video_id for extension
      const response = await fetch(
        `/api/media-studio/library?workspace_id=${workspaceId}&type=video&limit=50`
      );
      const data = await response.json();

      if (data.items) {
        // Filter to only Veo videos that can be extended
        const veoVideos = data.items.filter((item: any) => {
          const config = item.config || {};
          const hasVeoId = !!config.veo_video_id;
          const extensionCount = config.extension_count || 0;
          const isVeoSource = item.source?.startsWith('veo-');
          return hasVeoId && isVeoSource && extensionCount < VEO_MAX_EXTENSIONS;
        });
        setStoredVideos(veoVideos);
      }
    } catch (err) {
    } finally {
      setIsLoadingVideos(false);
    }
  }, [workspaceId]);

  // Load stored videos on mount
  useEffect(() => {
    fetchStoredVideos();
  }, [fetchStoredVideos]);

  // Combine in-memory and stored videos (remove duplicates)
  const allExtendableVideos = [
    ...extendableVideos,
    ...storedVideos
      .filter(sv => !extendableVideos.some(ev => ev.id === sv.id))
      .map(sv => ({
        id: sv.id,
        url: sv.url,
        prompt: sv.prompt,
        config: {
          prompt: sv.prompt,
          model: (sv.config.model || 'veo-3.1-generate-preview') as VeoModel,
          aspectRatio: (sv.config.aspectRatio || '16:9') as any,
          duration: (sv.config.duration || 8) as any,
          resolution: '720p' as any,
          generation_mode: 'extend' as any,
          extension_count: sv.config.extension_count || 0,
          total_duration: sv.config.total_duration || sv.config.duration || 8,
          veo_video_id: sv.config.veo_video_id,
        },
        status: 'completed' as const,
        createdAt: new Date(sv.created_at).getTime(),
        hasAudio: true,
        veoVideoId: sv.config.veo_video_id,
        extensionCount: sv.config.extension_count || 0,
        isExtendable: (sv.config.extension_count || 0) < VEO_MAX_EXTENSIONS,
        thumbnailUrl: sv.thumbnail_url,
      } as GeneratedVeoVideo))
  ];

  // Get selected video details
  const selectedVideo = allExtendableVideos.find(v => v.id === selectedVideoId);
  const currentExtensionCount = selectedVideo?.extensionCount || 0;
  const canExtend = currentExtensionCount < VEO_MAX_EXTENSIONS;
  const remainingExtensions = VEO_MAX_EXTENSIONS - currentExtensionCount;
  const currentDuration = selectedVideo?.config.total_duration || selectedVideo?.config.duration || 8;
  const newDuration = currentDuration + VEO_EXTENSION_SECONDS;

  // Handle improve prompt click
  const handleImprovePrompt = () => {
    if (!prompt.trim()) {
      setImprovementError('Please enter a prompt first');
      setTimeout(() => setImprovementError(null), 3000);
      return;
    }
    setShowImprovementModal(true);
    setImprovementError(null);
  };

  // Submit improvement request
  const handleSubmitImprovement = async () => {
    if (!prompt.trim()) return;

    setIsImprovingPrompt(true);
    setImprovementError(null);
    setShowImprovementModal(false);

    try {
      const response = await fetch('/api/ai/media/prompt/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: prompt,
          mediaType: 'video-editing',
          mediaSubType: 'video-extend',
          provider: 'google',
          model: model,
          userInstructions: improvementInstructions || undefined,
          modelId: selectedAIModelId,
          context: {
            aspectRatio: selectedVideo?.config.aspectRatio,
            duration: newDuration,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to improve prompt');
      }

      // Update prompt with improved version
      setPrompt(data.improvedPrompt);
      setImprovementInstructions('');

    } catch (error) {
      console.error('Prompt improvement error:', error);
      setImprovementError(getUserFriendlyError(error));
      setTimeout(() => setImprovementError(null), 5000);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      onError('Please enter a prompt describing what happens next');
      return;
    }

    if (!selectedVideo) {
      onError('Please select a video to extend');
      return;
    }

    if (!selectedVideo.veoVideoId) {
      onError('Selected video does not have a Veo video ID. Only Veo-generated videos can be extended.');
      return;
    }

    if (!canExtend) {
      onError(`Maximum ${VEO_MAX_EXTENSIONS} extensions reached for this video`);
      return;
    }

    try {
      const response = await fetch('/api/ai/media/veo/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veoVideoId: selectedVideo.veoVideoId,
          prompt: prompt.trim(),
          model,
          extensionCount: currentExtensionCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video extension');
      }

      const video: GeneratedVeoVideo = {
        id: data.operationId,
        prompt: prompt.trim(),
        config: {
          prompt: prompt.trim(),
          model,
          aspectRatio: selectedVideo.config.aspectRatio,
          duration: selectedVideo.config.duration,
          resolution: '720p', // Extensions are fixed to 720p
          generation_mode: 'extend',
          parent_video_id: selectedVideo.id,
          extension_count: data.newExtensionCount,
          total_duration: newDuration,
        },
        status: 'pending',
        progress: 0,
        createdAt: Date.now(),
        hasAudio: true,
        operationId: data.operationId,
        operationName: data.operationName,
        extensionCount: data.newExtensionCount,
        isExtendable: data.newExtensionCount < VEO_MAX_EXTENSIONS,
        thumbnailUrl: selectedVideo.thumbnailUrl,
      };

      onGenerationStarted(video, 'veo-extend');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to extend video');
    }
  }, [prompt, selectedVideo, model, currentExtensionCount, canExtend, newDuration, onGenerationStarted, onError]);

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 text-xs bg-card border border-border text-foreground p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Video Extension</p>
          <p className="mt-1 text-muted-foreground">
            Each extension adds {VEO_EXTENSION_SECONDS} seconds. Maximum {VEO_MAX_EXTENSIONS} extensions per video.
            Resolution is fixed to 720p for extensions.
          </p>
        </div>
      </div>

      {/* Video Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Select Video to Extend</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStoredVideos}
            disabled={isLoadingVideos}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingVideos ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoadingVideos ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading videos...</p>
          </div>
        ) : allExtendableVideos.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <Video className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No extendable videos available.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a video first using Veo Text or Image mode.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Select
              value={selectedVideoId || ''}
              onValueChange={setSelectedVideoId}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a video..." />
              </SelectTrigger>
              <SelectContent>
                {allExtendableVideos.map((video) => {
                  const extCount = video.extensionCount || 0;
                  const remaining = VEO_MAX_EXTENSIONS - extCount;
                  const totalDur = video.config.total_duration || video.config.duration || 8;
                  return (
                    <SelectItem key={video.id} value={video.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[180px]">{video.prompt}</span>
                        <Badge variant="outline" className="text-xs">
                          {totalDur}s
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {remaining} ext left
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {storedVideos.length} videos from library, {extendableVideos.length} recent
            </p>
          </div>
        )}
      </div>

      {/* Selected Video Preview */}
      {selectedVideo && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selected Video</span>
            <Badge variant={canExtend ? 'default' : 'destructive'}>
              {canExtend ? `${remainingExtensions} extensions left` : 'Max reached'}
            </Badge>
          </div>
          {selectedVideo.url && (
            <video
              src={selectedVideo.url}
              className="w-full h-32 object-cover rounded"
              controls
            />
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Current: {currentDuration}s
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              After: {newDuration}s
            </span>
          </div>
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-sm font-medium">
          Extension Prompt
        </Label>
        <Textarea
          id="prompt"
          placeholder="Describe what happens next in the video... E.g., The camera pans to reveal a beautiful sunset over the mountains"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating || !selectedVideo}
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-start gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImprovePrompt}
            disabled={isImprovingPrompt || !prompt.trim() || isGenerating || !selectedVideo}
            className="h-7 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600 border-0"
          >
            {isImprovingPrompt ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                Improving...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1.5" />
                Improve Prompt
              </>
            )}
          </Button>
          {improvementError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {improvementError}
            </span>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Model</Label>
        <Select
          value={model}
          onValueChange={(v: string) => setModel(v as VeoModel)}
          disabled={isGenerating}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEO_MODEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warning if max extensions reached */}
      {selectedVideo && !canExtend && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <span>Maximum {VEO_MAX_EXTENSIONS} extensions reached. Generate a new video to continue.</span>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim() || !selectedVideo || !canExtend}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Extending...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Extend Video (+{VEO_EXTENSION_SECONDS}s)
          </>
        )}
      </Button>

      {/* AI Prompt Improvement Modal */}
      {showImprovementModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowImprovementModal(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Improve Prompt with AI</h3>
                  <p className="text-xs text-muted-foreground">Enhance video extension prompt</p>
                </div>
              </div>
              <button
                onClick={() => setShowImprovementModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  What would you like to improve? <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Textarea
                  value={improvementInstructions}
                  onChange={(e) => setImprovementInstructions(e.target.value)}
                  placeholder="Example: Describe continuation clearly, add motion details, include scene flow..."
                  rows={7}
                  className="resize-none min-h-[160px]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Scene Continuation', instruction: 'Continue the action naturally. Maintain subject position, movement direction, and visual consistency (lighting, colors, style).' },
                    { label: 'Product Reveal', instruction: 'Reveal more product details: new camera angle, feature demonstration, or quality close-ups. Build the product story.' },
                    { label: 'Story Progression', instruction: 'Progress the narrative: add the next story beat, introduce new action, build toward climax while maintaining consistency.' },
                    { label: 'Audio Continuity', instruction: 'Continue audio seamlessly: ambient sounds, dialogue, or music progression. Specify new sounds for the extension.' },
                    { label: 'Camera Evolution', instruction: 'Transition camera: shift to new angle, add push-in or pull-out, change perspective while keeping subject focus.' },
                    { label: 'Climactic Moment', instruction: 'Build to a climax: intensify action, dramatic lighting change, reveal hero shot. Create memorable ending.' }
                  ].map((suggestion) => (
                    <button
                      key={suggestion.label}
                      onClick={() => setImprovementInstructions(prev => prev ? `${prev}\n\n${suggestion.instruction}` : suggestion.instruction)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Model Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">AI Model</label>
                <div className="relative inline-block">
                  <button type="button" onClick={() => setShowAIModelDropdown(!showAIModelDropdown)} className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 transition-colors bg-muted/50 text-foreground flex items-center gap-2 text-xs">
                    <span>{getModelDisplayName(selectedAIModelId)}</span>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showAIModelDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showAIModelDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto whitespace-nowrap">
                      {AI_MODELS.map((aiModel) => (
                        <button key={aiModel.id} type="button" onClick={() => { setSelectedAIModelId(aiModel.id); setShowAIModelDropdown(false); }} className={`w-full px-3 py-1.5 text-left hover:bg-muted transition-colors flex items-center gap-2 text-xs ${selectedAIModelId === aiModel.id ? 'bg-primary/10' : ''}`}>
                          <span className="text-foreground">{aiModel.name} <span className="text-muted-foreground">({aiModel.providerLabel})</span></span>
                          {selectedAIModelId === aiModel.id && <Check className="w-3 h-3 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Describe what happens next to maintain continuity. Video will extend by {VEO_EXTENSION_SECONDS}s.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30">
              <Button
                onClick={() => {
                  setShowImprovementModal(false);
                  setImprovementInstructions('');
                }}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitImprovement}
                disabled={isImprovingPrompt}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isImprovingPrompt ? 'Improving...' : 'Improve Prompt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VeoVideoExtension;

