/**
 * Content Agent Schemas
 * Zod validation schemas for content operations
 */

import * as z from 'zod';
import { BusinessContextSchema } from './businessContext.schema';

// ============================================================================
// Content Generation Schemas
// ============================================================================

export const contentGenerationRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  platforms: z.array(z.string()).min(1, 'At least one platform is required'),
  contentType: z.enum(['engaging', 'educational', 'promotional', 'storytelling']),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational', 'urgent', 'friendly']),
});

export type ContentGenerationRequestInput = z.infer<typeof contentGenerationRequestSchema>;

// ============================================================================
// Improve Prompt Schemas
// ============================================================================

export const improvePromptRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['image', 'video']),
  userGuidance: z.string().optional(),
});

export type ImprovePromptRequestInput = z.infer<typeof improvePromptRequestSchema>;

// ============================================================================
// Chat Strategist Schemas
// ============================================================================

// Attachment schema for multimodal support
export const attachmentSchema = z.object({
  type: z.enum(['image', 'pdf', 'docx', 'pptx', 'document', 'text', 'csv', 'json']),
  name: z.string(),
  data: z.string(), // base64 encoded data
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

export const chatStrategistRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  threadId: z.string().min(1).optional(),
  attachments: z.array(attachmentSchema).max(5, 'Maximum 5 attachments allowed').optional(),
  userId: z.string().optional(),
  businessContext: BusinessContextSchema.optional(),
  modelId: z.string().optional().describe('Model ID for dynamic model selection (e.g., "openai:gpt-4o")'),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;
export type ChatStrategistRequestInput = z.infer<typeof chatStrategistRequestSchema>;

// ============================================================================
// Dynamic Content Schema Builder
// ============================================================================

/**
 * Build content schema for specific platforms
 */
export function buildContentSchema(platforms: string[]) {
  return z.object({
    imageSuggestion: z.string(),
    videoSuggestion: z.string(),
    ...platforms.reduce((acc, platform) => {
      acc[platform] = z.string();
      return acc;
    }, {} as Record<string, z.ZodString>),
  });
}

