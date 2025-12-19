/**
 * Video Agent Schemas
 * Zod validation schemas for video operations
 */

import * as z from 'zod';

// ============================================================================
// Video Generation Schemas
// ============================================================================

export const videoGenerationRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.enum(['sora-2', 'sora-2-pro']).optional().default('sora-2'),
  size: z.enum(['1280x720', '1920x1080']).optional().default('1280x720'),
  seconds: z.enum(['8', '16']).optional().default('8'),
});

export type VideoGenerationRequestInput = z.infer<typeof videoGenerationRequestSchema>;

// ============================================================================
// Video Status Schemas
// ============================================================================

export const videoStatusRequestSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
});

export type VideoStatusRequestInput = z.infer<typeof videoStatusRequestSchema>;

// ============================================================================
// Video Download Schemas
// ============================================================================

export const videoDownloadRequestSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
});

export type VideoDownloadRequestInput = z.infer<typeof videoDownloadRequestSchema>;
