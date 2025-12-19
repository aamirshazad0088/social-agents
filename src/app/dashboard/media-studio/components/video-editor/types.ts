/**
 * Video Editor Types
 * Shared types for video editor components
 */

export interface VideoItem {
  id: string;
  url: string;
  type: 'video';
  prompt?: string;
  created_at: string;
  thumbnail_url?: string;
  duration?: number;
}

export interface AudioItem {
  id: string;
  url: string;
  type: 'audio';
  name: string;
  duration?: number;
  created_at: string;
  source?: string;
}

export interface VideoMergeConfig {
  videos: VideoItem[];
  title?: string;
}

export interface AudioProcessingConfig {
  videoUrl: string;
  muteOriginal: boolean;
  backgroundMusicUrl?: string;
  originalVolume: number; // 0-100
  musicVolume: number; // 0-100
}

export interface ProcessedVideo {
  id: string;
  url: string;
  type: 'video';
  prompt: string;
  created_at: string;
}
