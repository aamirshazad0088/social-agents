/**
 * Content Agent Types
 * Type definitions for content generation and repurposing
 */

import { Platform, Tone, ContentType, PostContent } from '@/types';
import { BaseAgentRequest, BaseAgentResponse } from '@/agents/shared/types/common.types';
import { AttachmentInput } from '../schemas/content.schemas';
import { BusinessContext } from '../schemas/businessContext.schema';

// ============================================================================
// Content Generation Types
// ============================================================================

export interface ContentGenerationRequest extends BaseAgentRequest {
  topic: string;
  platforms: Platform[];
  contentType: ContentType;
  tone: Tone;
}

export interface ContentGenerationResponse extends BaseAgentResponse {
  content: PostContent;
}

// ============================================================================
// Prompt Improvement Types
// ============================================================================

export interface ImprovePromptRequest extends BaseAgentRequest {
  prompt: string;
  type: 'image' | 'video';
  userGuidance?: string;
}

export interface ImprovePromptResponse extends BaseAgentResponse {
  improvedPrompt: string;
  originalPrompt: string;
  type: 'image' | 'video';
}

// ============================================================================
// Chat Strategist Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatStrategistRequest extends BaseAgentRequest {
  message: string;
  history?: ChatMessage[];
  threadId?: string;
  attachments?: AttachmentInput[];
  businessContext?: BusinessContext;
  modelId?: string;
}

export interface ChatStrategistResponse extends BaseAgentResponse {
  response: string;
  threadId?: string;
  readyToGenerate?: boolean;
  contentGenerated?: boolean;
  generatedContent?: PostContent | {
    contents: Array<{
      platform: string;
      contentType: 'image' | 'video';
      format?: 'post' | 'reel' | 'short' | 'story' | 'carousel' | 'feed';
      title?: string;
      description?: string;
      imagePrompt?: string;
      videoPrompt?: string;
    }>;
  };
  parameters?: {
    topic: string;
    platforms: Platform[];
    contentType: ContentType;
    tone: Tone;
  };
}
