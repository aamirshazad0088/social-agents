'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  X,
} from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
  showControls?: boolean;
}

export function VideoPreview({ videoUrl, title, onClose, showControls = true }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value[0];
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentTime(0);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          {title || 'Video Preview'}
        </CardTitle>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Video Player */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video object-contain"
            onClick={togglePlay}
            playsInline
          />

          {/* Play overlay */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="p-3 space-y-2 bg-muted/50">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={togglePlay} className="h-8 w-8 p-0">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={restart} className="h-8 w-8 p-0">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={toggleMute} className="h-8 w-8 p-0">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
                <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="h-8 w-8 p-0">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
