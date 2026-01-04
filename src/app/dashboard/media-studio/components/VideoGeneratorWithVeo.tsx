'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Volume2, Bot, Wand2 } from 'lucide-react';
import { VideoGenerator } from './VideoGenerator';
import { VeoVideoGenerator } from './veo';
import { RunwayVideoGenerator } from './runway';
import type { GeneratedVideo, GeneratedImage, GeneratedVeoVideo, GeneratedRunwayVideo } from '../types/mediaStudio.types';

// ============================================================================
// Types
// ============================================================================

type VideoProvider = 'openai' | 'google' | 'runway';

interface VideoGeneratorWithVeoProps {
  onVideoStarted: (video: GeneratedVideo | GeneratedVeoVideo | GeneratedRunwayVideo) => void;
  onVideoUpdate: (videoId: string, updates: Partial<GeneratedVideo | GeneratedVeoVideo | GeneratedRunwayVideo>) => void;
  recentVideos: GeneratedVideo[];
  recentVeoVideos: GeneratedVeoVideo[];
  recentRunwayVideos?: GeneratedRunwayVideo[];
  recentImages: GeneratedImage[];
}

// ============================================================================
// Component
// ============================================================================

export function VideoGeneratorWithVeo({
  onVideoStarted,
  onVideoUpdate,
  recentVideos,
  recentVeoVideos,
  recentRunwayVideos = [],
  recentImages,
}: VideoGeneratorWithVeoProps) {
  const [provider, setProvider] = useState<VideoProvider>('openai');

  return (
    <div className="space-y-4">
      {/* Provider Selection Tabs - Clean Design */}
      <Tabs value={provider} onValueChange={(v) => setProvider(v as VideoProvider)}>
        <TabsList className="inline-flex h-auto p-0.5 bg-muted rounded-lg gap-0.5">
          <TabsTrigger
            value="openai"
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-md transition-all duration-200
              data-[state=active]:bg-white dark:data-[state=active]:bg-white data-[state=active]:shadow-sm
              data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-900
              data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-white/20
              data-[state=inactive]:text-foreground
            `}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ background: 'var(--ms-gradient-primary)' }}
            >
              <Bot className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-medium text-xs">OpenAI Sora</span>
          </TabsTrigger>
          <TabsTrigger
            value="google"
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-md transition-all duration-200
              data-[state=active]:bg-white dark:data-[state=active]:bg-white data-[state=active]:shadow-sm
              data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-900
              data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-white/20
              data-[state=inactive]:text-foreground
            `}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 100%)' }}
            >
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-medium text-xs">Google Veo</span>
            <Badge
              className="text-[9px] px-1 py-0 flex items-center gap-0.5 border-0 h-4"
              style={{ background: 'var(--ms-accent)', color: 'var(--ms-accent-foreground)' }}
            >
              <Volume2 className="w-2 h-2" />
              Audio
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="runway"
            className={`
              flex items-center gap-1.5 px-3 py-1 rounded-md transition-all duration-200
              data-[state=active]:bg-white dark:data-[state=active]:bg-white data-[state=active]:shadow-sm
              data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-900
              data-[state=inactive]:hover:bg-white/50 dark:data-[state=inactive]:hover:bg-white/20
              data-[state=inactive]:text-foreground
            `}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
            >
              <Wand2 className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-medium text-xs">Runway Gen4</span>
            <Badge
              className="text-[9px] px-1 py-0 flex items-center gap-0.5 border-0 h-4"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: 'white' }}
            >
              Style
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* OpenAI Sora Content */}
        <TabsContent value="openai" className="mt-4">
          <VideoGenerator
            onVideoStarted={onVideoStarted as (video: GeneratedVideo) => void}
            onVideoUpdate={onVideoUpdate as (videoId: string, updates: Partial<GeneratedVideo>) => void}
            recentVideos={recentVideos}
            recentImages={recentImages}
          />
        </TabsContent>

        {/* Google Veo Content */}
        <TabsContent value="google" className="mt-4">
          <VeoVideoGenerator
            onVideoStarted={onVideoStarted as (video: GeneratedVeoVideo) => void}
            onVideoUpdate={onVideoUpdate as (videoId: string, updates: Partial<GeneratedVeoVideo>) => void}
            recentVideos={recentVeoVideos}
            recentImages={recentImages}
          />
        </TabsContent>

        {/* Runway Gen4 Content */}
        <TabsContent value="runway" className="mt-4">
          <RunwayVideoGenerator
            onVideoStarted={onVideoStarted as (video: GeneratedRunwayVideo) => void}
            onVideoUpdate={onVideoUpdate as (videoId: string, updates: Partial<GeneratedRunwayVideo>) => void}
            recentVideos={recentRunwayVideos}
            recentImages={recentImages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VideoGeneratorWithVeo;


