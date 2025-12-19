'use client';

import React from 'react';
import { MediaGallery } from '../media-studio/components/MediaGallery';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LibraryPage() {
  const { workspaceId } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-orange-900 to-amber-900 dark:from-amber-950 dark:via-orange-950 dark:to-amber-950">
        {/* Animated background elements - Enhanced */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large animated orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s', animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1.5s', animationDuration: '4s' }} />

          {/* Additional floating orbs */}
          <div className="absolute top-10 right-1/4 w-32 h-32 bg-orange-400/25 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
          <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-amber-400/25 rounded-full blur-2xl animate-pulse"
            style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
        </div>

        {/* Grid pattern overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Logo with enhanced glow */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-2xl blur-xl opacity-75 animate-pulse group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 rounded-2xl blur-2xl opacity-50 animate-pulse"
                style={{ animationDelay: '0.5s' }} />
              <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-3 rounded-2xl shadow-2xl transform transition-transform group-hover:scale-105">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                Media Library
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs shadow-lg hover:shadow-orange-500/50 transition-shadow">
                  <Zap className="w-3 h-3 mr-1 animate-pulse" />
                  All Media
                </Badge>
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                Browse and manage all your generated images and videos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gradient-to-b from-muted/30 to-background overflow-auto">
        <MediaGallery
          images={[]}
          videos={[]}
          workspaceId={workspaceId || undefined}
        />
      </div>
    </div>
  );
}
