import { z } from 'zod';
import { Platform, Tone, ContentType } from '@/types';

// Platform validation
export const platformSchema = z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube']);

// Content generation validation
export const generateContentSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(500, 'Topic too long'),
  platforms: z.array(platformSchema).min(1, 'At least one platform required'),
  contentType: z.enum(['engaging', 'educational', 'promotional', 'storytelling']),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational', 'urgent', 'friendly']),
});

// Image generation validation
export const generateImageSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000, 'Prompt too long'),
});

// Video generation validation
export const generateVideoSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000, 'Prompt too long'),
});

// Prompt improvement validation
export const improvePromptSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(2000, 'Prompt too long'),
  type: z.enum(['image', 'video']),
  userGuidance: z.string().max(500).optional(),
});

// Engagement score validation
export const generateEngagementScoreSchema = z.object({
  postContent: z.string().min(1, 'Post content required').max(5000),
  platform: platformSchema,
  hasImage: z.boolean(),
  hasVideo: z.boolean(),
});

// Chat message schema
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Content strategist chat validation
export const contentStrategistChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  history: z.array(chatMessageSchema).max(50, 'Conversation history too long').optional(),
});
