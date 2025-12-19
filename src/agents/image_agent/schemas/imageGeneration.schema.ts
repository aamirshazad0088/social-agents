/**
 * Image Generation Schemas
 * Zod validation schemas for image generation features
 */

import { z } from 'zod';

/**
 * Image Generation Options Schema
 * Supports all models: gpt-image-1.5, dall-e-3, dall-e-2
 */
export const imageGenerationOptionsSchema = z.object({
  // Model selection
  model: z.enum(['gpt-image-1.5', 'dall-e-3', 'dall-e-2']).optional().default('gpt-image-1.5'),

  // Size options (vary by model)
  // gpt-image-1.5: 1024x1024, 1536x1024, 1024x1536, auto
  // dall-e-3: 1024x1024, 1792x1024, 1024x1792
  // dall-e-2: 256x256, 512x512, 1024x1024
  size: z.enum(['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792', '512x512', '256x256', 'auto']).optional(),

  // Quality options (vary by model)
  // gpt-image-1.5: low, medium, high, auto
  // dall-e-3: standard, hd
  // dall-e-2: standard
  quality: z.enum(['low', 'medium', 'high', 'auto', 'standard', 'hd']).optional(),

  // gpt-image-1.5 specific: output format (png, jpeg, webp)
  format: z.enum(['png', 'jpeg', 'webp']).optional(),

  // gpt-image-1.5 specific: background transparency
  background: z.enum(['transparent', 'opaque', 'auto']).optional(),

  // gpt-image-1.5 specific: compression for jpeg/webp (0-100)
  output_compression: z.number().min(0).max(100).optional(),

  // gpt-image-1.5 specific: content moderation level
  moderation: z.enum(['auto', 'low']).optional(),

  // dall-e-3 specific: style
  style: z.enum(['vivid', 'natural']).optional(),

  // Number of images (1-10 for gpt-image-1.5/dall-e-2, only 1 for dall-e-3)
  n: z.number().min(1).max(10).optional(),
});

/**
 * Basic Image Generation Request Schema
 * Per OpenAI docs: max prompt length varies by model
 * - gpt-image-1.5: 32000 characters
 * - dall-e-3: 4000 characters  
 * - dall-e-2: 1000 characters
 */
export const generateImageRequestSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(32000, 'Prompt is too long'),
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Streaming Image Generation Request Schema
 * Per OpenAI docs: partial_images can be 0-3
 */
export const streamingImageRequestSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
  options: imageGenerationOptionsSchema.optional(),
  partial_images: z.number().min(0).max(3).default(2), // Number of partial images (0-3)
});

/**
 * Image Editing with Mask Request Schema
 */
export const editImageWithMaskSchema = z.object({
  prompt: z.string().min(3, 'Edit prompt is required'),
  imageUrl: z.string().url('Valid image URL required'),
  maskUrl: z.string().url('Valid mask URL required'),
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Image from References Request Schema
 * Per OpenAI docs: supports multiple input images with input_fidelity
 */
export const generateFromReferencesSchema = z.object({
  prompt: z.string().min(3, 'Prompt is required'),
  referenceImageUrls: z.array(z.string().url()).min(1).max(4, 'Maximum 4 reference images'),
  input_fidelity: z.enum(['low', 'high']).default('high'), // Per OpenAI docs
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Improve Prompt Request Schema
 */
export const improvePromptSchema = z.object({
  originalPrompt: z.string().min(1, 'Original prompt is required'),
  type: z.enum(['image', 'video']),
  userGuidance: z.string().optional(),
  targetPlatforms: z.array(z.string()).optional(),
});

/**
 * Image Generation Preset Schema
 */
export const imagePresetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  options: imageGenerationOptionsSchema,
  icon: z.string().optional(),
});

// Export types
export type ImageGenerationOptionsInput = z.infer<typeof imageGenerationOptionsSchema>;
export type GenerateImageRequestInput = z.infer<typeof generateImageRequestSchema>;
export type StreamingImageRequestInput = z.infer<typeof streamingImageRequestSchema>;
export type EditImageWithMaskInput = z.infer<typeof editImageWithMaskSchema>;
export type GenerateFromReferencesInput = z.infer<typeof generateFromReferencesSchema>;
export type ImprovePromptInput = z.infer<typeof improvePromptSchema>;
export type ImagePresetInput = z.infer<typeof imagePresetSchema>;
