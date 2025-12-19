/**
 * Content Improvement Agent Schemas
 * Zod validation schemas for content improvement operations
 */

import * as z from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Schema for content improvement request
 */
export const improveContentRequestSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']),
  postType: z.enum(['post', 'feed', 'carousel', 'reel', 'story', 'video', 'short', 'slideshow']).optional(),
  additionalInstructions: z.string().optional(),
  modelId: z.string().optional().describe('Model ID for dynamic model selection (e.g., "openai:gpt-4o", "anthropic:claude-3-5-sonnet-20241022")'),
});

export type ImproveContentRequestInput = z.infer<typeof improveContentRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for improved content response using LangChain structured output
 */
export const ImprovedContentSchema = z.object({
  improvedDescription: z.string().describe('The improved, optimized content description'),
  improvements: z.array(z.string()).describe('List of key improvements made'),
  hashtags: z.array(z.string()).optional().describe('Suggested hashtags (if applicable for platform)'),
  emoji: z.boolean().describe('Whether emojis were added'),
  callToAction: z.boolean().describe('Whether a call-to-action was included'),
});

export type ImprovedContentOutput = z.infer<typeof ImprovedContentSchema>;

// ============================================================================
// Agent Response Schema
// ============================================================================

/**
 * Complete response from improvement agent
 */
export const improvementAgentResponseSchema = z.object({
  success: z.boolean(),
  originalDescription: z.string(),
  improvedDescription: z.string(),
  improvements: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  metadata: z.object({
    platform: z.string(),
    postType: z.string().optional(),
    characterCount: z.number(),
    timestamp: z.string(),
  }),
  error: z.string().optional(),
});

export type ImprovementAgentResponse = z.infer<typeof improvementAgentResponseSchema>;
