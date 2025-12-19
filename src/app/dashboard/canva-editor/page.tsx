'use client';

import React from 'react';
import { CanvaEditor } from '../media-studio/components/CanvaEditor';
import { Badge } from '@/components/ui/badge';
import { Palette, Zap } from 'lucide-react';

export default function CanvaEditorPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-pink-900 to-purple-900 dark:from-purple-950 dark:via-pink-950 dark:to-purple-950">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-2xl blur-lg opacity-75 animate-pulse" />
              <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-3 rounded-2xl">
                <Palette className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                Canva Editor
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Design Tools
                </Badge>
              </h1>
              <p className="text-white/70 mt-1">
                Edit your media with Canva's powerful design tools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gradient-to-b from-muted/30 to-background overflow-auto">
        <CanvaEditor
          onMediaSaved={(url) => {
          }}
        />
      </div>
    </div>
  );
}
