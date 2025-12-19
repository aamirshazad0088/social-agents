/**
 * Video Agent Types
 * Type definitions for video generation operations
 */

import { BaseAgentRequest, BaseAgentResponse } from '@/agents/shared/types/common.types';

// ============================================================================
// Video Generation Types
// ============================================================================

export interface VideoGenerationRequest extends BaseAgentRequest {
  prompt: string;
  model?: 'sora-2' | 'sora-2-pro';
  size?: '1280x720' | '1920x1080';
  seconds?: '8' | '16';
}

export interface VideoGenerationResponse extends BaseAgentResponse {
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
}

// ============================================================================
// Video Status Types
// ============================================================================

export interface VideoStatusRequest extends BaseAgentRequest {
  videoId: string;
}

export interface VideoStatusResponse extends BaseAgentResponse {
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

// ============================================================================
// Video Download Types
// ============================================================================

export interface VideoDownloadRequest extends BaseAgentRequest {
  videoId: string;
}

export interface VideoDownloadResponse extends BaseAgentResponse {
  videoBuffer: Buffer;
  size: number;
  format: string;
}
