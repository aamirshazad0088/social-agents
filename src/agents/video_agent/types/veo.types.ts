/**
 * Veo 3.1 Video Generation Types
 * Type definitions for Google Veo 3.1 video generation API
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { BaseAgentRequest, BaseAgentResponse } from '@/agents/shared/types/common.types';

// ============================================================================
// Veo Model Types
// ============================================================================

export type VeoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview';

export type VeoResolution = '720p' | '1080p';

export type VeoDuration = 4 | 6 | 8;

export type VeoAspectRatio = '16:9' | '9:16';

// ============================================================================
// Veo Generation Mode Types
// ============================================================================

export type VeoGenerationMode = 
  | 'text'           // Text-to-video
  | 'image'          // Image-to-video (first frame)
  | 'extend'         // Video extension
  | 'frame-specific' // First + last frame
  | 'reference';     // Reference images (1-3)

// ============================================================================
// Veo Video Metadata (stored in config field)
// ============================================================================

export interface VeoVideoConfig {
  // Generation parameters
  model: VeoModel;
  prompt: string;
  aspectRatio: VeoAspectRatio;
  duration: VeoDuration;
  resolution: VeoResolution;
  
  // Veo-specific IDs (REQUIRED for extension feature)
  veo_video_id: string;        // Google's video file reference
  veo_operation_id: string;    // Operation ID
  
  // Extension tracking
  extension_count: number;     // 0-20
  parent_video_id?: string;    // If extended, link to parent media_library ID
  is_extendable: boolean;      // true if count < 20
  total_duration: number;      // Cumulative seconds
  
  // Source tracking (for different generation modes)
  input_image_url?: string;        // For image-to-video
  first_frame_url?: string;        // For frame-specific
  last_frame_url?: string;         // For frame-specific
  reference_image_urls?: string[]; // For reference images (1-3)
  
  // Generation mode
  generation_mode: VeoGenerationMode;
}

// ============================================================================
// Text-to-Video Types
// ============================================================================

export interface VeoTextToVideoRequest extends BaseAgentRequest {
  prompt: string;
  model?: VeoModel;
  aspectRatio?: VeoAspectRatio;
  duration?: VeoDuration;
  resolution?: VeoResolution;
  personGeneration?: 'allow_adult' | 'dont_allow'; // For EU/UK regions
}

export interface VeoTextToVideoResponse extends BaseAgentResponse {
  operationId: string;
  operationName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// Image-to-Video Types
// ============================================================================

export interface VeoImageToVideoRequest extends BaseAgentRequest {
  imageUrl: string; // URL or base64 data URL
  prompt: string;
  model?: VeoModel;
  aspectRatio?: VeoAspectRatio;
  duration?: VeoDuration;
  resolution?: VeoResolution;
}

export interface VeoImageToVideoResponse extends BaseAgentResponse {
  operationId: string;
  operationName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// Video Extension Types
// ============================================================================

export interface VeoExtendVideoRequest extends BaseAgentRequest {
  veoVideoId: string;      // Google's video file reference from previous generation
  prompt: string;          // Extension prompt
  model?: VeoModel;
  extensionCount: number;  // Current extension count (for validation)
}

export interface VeoExtendVideoResponse extends BaseAgentResponse {
  operationId: string;
  operationName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  newExtensionCount: number;
}

// ============================================================================
// Frame-Specific Generation Types (First + Last Frame)
// ============================================================================

export interface VeoFrameSpecificRequest extends BaseAgentRequest {
  firstFrameUrl: string;  // URL or base64 data URL
  lastFrameUrl: string;   // URL or base64 data URL
  prompt: string;         // Transition description
  model?: VeoModel;
  aspectRatio?: VeoAspectRatio;
  duration?: VeoDuration;
  resolution?: VeoResolution;
}

export interface VeoFrameSpecificResponse extends BaseAgentResponse {
  operationId: string;
  operationName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// Reference Images Generation Types (1-3 Images)
// ============================================================================

export interface VeoReferenceImagesRequest extends BaseAgentRequest {
  referenceImageUrls: string[]; // 1-3 images (URLs or base64)
  prompt: string;
  model?: VeoModel;
  aspectRatio?: VeoAspectRatio;
  resolution?: VeoResolution;
  // Duration is fixed to 8s for reference images
}

export interface VeoReferenceImagesResponse extends BaseAgentResponse {
  operationId: string;
  operationName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// Operation Status Types
// ============================================================================

export interface VeoOperationStatusRequest extends BaseAgentRequest {
  operationId: string;
  operationName?: string;
}

export interface VeoOperationStatusResponse extends BaseAgentResponse {
  operationId: string;
  done: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // Estimated progress percentage
  video?: {
    url: string;           // Download URL (temporary)
    veoVideoId: string;    // Google's video file reference for extension
    duration: number;      // Video duration in seconds
    resolution: VeoResolution;
  };
  error?: string;
}

// ============================================================================
// Download Types
// ============================================================================

export interface VeoDownloadRequest extends BaseAgentRequest {
  veoVideoId: string;      // Google's video file reference
  operationId: string;
}

export interface VeoDownloadResponse extends BaseAgentResponse {
  videoBuffer: Buffer;
  size: number;
  format: string;
  supabaseUrl?: string; // URL after uploading to Supabase
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that 1080p resolution is only used with 8s duration
 */
export function validateResolutionDuration(resolution: VeoResolution, duration: VeoDuration): boolean {
  if (resolution === '1080p' && duration !== 8) {
    return false;
  }
  return true;
}

/**
 * Validate extension count is within limits
 */
export function validateExtensionCount(count: number): boolean {
  return count >= 0 && count < 20;
}

/**
 * Validate reference images count (1-3)
 */
export function validateReferenceImagesCount(urls: string[]): boolean {
  return urls.length >= 1 && urls.length <= 3;
}

// ============================================================================
// Constants
// ============================================================================

export const VEO_MODELS: { value: VeoModel; label: string; description: string }[] = [
  {
    value: 'veo-3.1-generate-preview',
    label: 'Veo 3.1',
    description: 'High quality video generation',
  },
  {
    value: 'veo-3.1-fast-generate-preview',
    label: 'Veo 3.1 Fast',
    description: 'Speed optimized, good quality',
  },
];

export const VEO_RESOLUTIONS: { value: VeoResolution; label: string; note?: string }[] = [
  { value: '720p', label: '720p HD' },
  { value: '1080p', label: '1080p Full HD', note: 'Only available for 8s duration' },
];

export const VEO_DURATIONS: { value: VeoDuration; label: string }[] = [
  { value: 4, label: '4 seconds' },
  { value: 6, label: '6 seconds' },
  { value: 8, label: '8 seconds' },
];

export const VEO_ASPECT_RATIOS: { value: VeoAspectRatio; label: string; description: string }[] = [
  { value: '16:9', label: 'Landscape (16:9)', description: 'Standard widescreen' },
  { value: '9:16', label: 'Portrait (9:16)', description: 'Vertical/mobile' },
];

// Extension constants
export const VEO_EXTENSION_SECONDS = 7;
export const VEO_MAX_EXTENSIONS = 20;
export const VEO_EXTENSION_RESOLUTION: VeoResolution = '720p'; // Fixed for extensions

// Polling constants
export const VEO_POLL_INTERVAL_MS = 10000; // 10 seconds
export const VEO_MIN_LATENCY_MS = 11000;   // 11 seconds minimum
export const VEO_MAX_LATENCY_MS = 360000;  // 6 minutes maximum

// Token limits
export const VEO_MAX_PROMPT_TOKENS = 1024;

// Image limits
export const VEO_MAX_IMAGE_SIZE_MB = 20;
export const VEO_SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

