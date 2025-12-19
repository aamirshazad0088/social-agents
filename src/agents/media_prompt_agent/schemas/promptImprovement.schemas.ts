/**
 * Media Prompt Improvement Agent Schemas
 * Zod validation schemas for prompt improvement operations
 */

import * as z from 'zod';

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Schema for prompt improvement request
 */
export const improvePromptRequestSchema = z.object({
  originalPrompt: z.string().min(1, 'Prompt is required'),
  mediaType: z.enum([
    'image-generation',
    'image-editing',
    'video-generation',
    'video-editing'
  ]),
  mediaSubType: z.enum([
    'text-to-image',
    'text-to-video',
    'image-to-video',
    'inpaint',
    'reference',
    'gemini-edit',
    'multi-turn',
    'video-extend',
    'frame-specific'
  ]).optional(),
  provider: z.enum(['openai', 'google']).optional(),
  model: z.string().optional(),
  userInstructions: z.string().optional(),
  modelId: z.string().optional().describe('Model ID for dynamic model selection (e.g., "openai:gpt-5.1", "anthropic:claude-sonnet-4.5")'),
  context: z.object({
    platform: z.string().optional(),
    aspectRatio: z.string().optional(),
    duration: z.number().optional(),
    resolution: z.string().optional(),
    hasReferenceImage: z.boolean().optional(),
  }).optional(),
});

export type ImprovePromptRequestInput = z.infer<typeof improvePromptRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for improved prompt response using LangChain structured output
 */
export const ImprovedPromptSchema = z.object({
  improvedPrompt: z.string().describe('The enhanced, detailed, production-ready prompt optimized for AI image/video generation. Include specific details about composition, lighting, style, and technical aspects.'),
  improvements: z.array(z.string()).describe('List of specific improvements made to the original prompt. Each item should clearly state what was enhanced or added.'),
  suggestions: z.array(z.string()).optional().describe('Optional additional suggestions for further refinement that the user might want to consider.'),
  technicalDetails: z.string().optional().describe('Summary of technical improvements added (camera angles, lighting, composition, etc.)'),
});

export type ImprovedPrompt = z.infer<typeof ImprovedPromptSchema>;

/**
 * Full API response type
 * 
 * Only improvedPrompt is required - frontend uses this to update the prompt field.
 * Other fields are optional for backward compatibility.
 */
export interface PromptImprovementResponse {
  success: boolean;
  improvedPrompt: string;
  improvements?: string[];
  suggestions?: string[];
  technicalDetails?: string;
  originalPrompt: string;
  mediaType: string;
  processingTime?: number;
}
