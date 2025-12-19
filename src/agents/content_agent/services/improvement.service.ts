/**
 * Content Improvement Agent Service
 * 
 * LangChain-based agent for improving social media content descriptions.
 * Uses custom middleware for dynamic system prompt injection.
 * 
 * ARCHITECTURE:
 * - LangChain createAgent with custom middleware
 * - Dynamic system prompt via wrapModelCall hook
 * - Runtime context for platform-specific guidelines
 * - Returns simple AI message (no structured output)
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/agents
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */

import { createAgent } from 'langchain';
import { createDynamicModel, DEFAULT_MODEL_ID } from '@/agents/shared';
import { Platform } from '@/types';
import { 
  ImproveContentRequestInput,
  ImprovementAgentResponse,
} from '../schemas/improvement.schemas';
import { PLATFORM_GUIDELINES } from '../prompts/improvement.prompts';
import {
  createContentImprovementMiddleware,
  buildUserPrompt,
  contentImprovementContextSchema,
  ContentImprovementContext,
} from '../middleware/improvement.middleware';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';

// ============================================================================
// Agent Configuration
// ============================================================================

const DEFAULT_MODEL = DEFAULT_MODEL_ID;

// ============================================================================
// Main Improvement Service
// ============================================================================

/**
 * Improve content description using LangChain agent with custom middleware
 * 
 * FLOW:
 * 1. Validate input
 * 2. Build runtime context
 * 3. Build user prompt
 * 4. Create model instance
 * 5. Create agent with middleware (dynamic system prompt)
 * 6. Invoke with runtime context
 * 7. Return response
 * 
 * @param input - Improvement request with description, platform, and post type
 * @returns Improved content
 */
export async function improveContentDescription(
  input: ImproveContentRequestInput
): Promise<ImprovementAgentResponse> {
  const startTime = Date.now();

  try {
    // ========================================================================
    // 1. VALIDATE INPUT
    // ========================================================================
    
    if (!input.description || input.description.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Description cannot be empty'
      );
    }

    const platformGuide = PLATFORM_GUIDELINES[input.platform];
    if (!platformGuide) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        `Unsupported platform: ${input.platform}`
      );
    }

    // ========================================================================
    // 2. BUILD RUNTIME CONTEXT
    // ========================================================================
    
    const runtimeContext: ContentImprovementContext = {
      platform: input.platform,
      description: input.description,
      postType: input.postType,
      additionalInstructions: input.additionalInstructions,
    };

    // ========================================================================
    // 3. BUILD USER PROMPT
    // ========================================================================
    
    const userPrompt = buildUserPrompt(runtimeContext);

    // ========================================================================
    // 4. CREATE MODEL INSTANCE (DYNAMIC)
    // ========================================================================
    
    // Use dynamic model selection - frontend can specify modelId
    const modelId = input.modelId || DEFAULT_MODEL;
    const model = await createDynamicModel(modelId);

    // ========================================================================
    // 5. CREATE AGENT WITH CUSTOM MIDDLEWARE
    // ========================================================================
    
    const agent = createAgent({
      model,
      tools: [],
      systemPrompt: 'You are an expert social media content strategist.',
      contextSchema: contentImprovementContextSchema,
      middleware: [createContentImprovementMiddleware()],
    });

    // ========================================================================
    // 6. INVOKE WITH RUNTIME CONTEXT
    // ========================================================================
    
    const result = await agent.invoke(
      { messages: [{ role: 'user' as const, content: userPrompt }] },
      { context: runtimeContext }
    );

    // ========================================================================
    // 7. EXTRACT AI MESSAGE CONTENT
    // ========================================================================
    
    const lastMessage = result.messages[result.messages.length - 1];
    let improvedDescription = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : String(lastMessage.content);
    
    if (!improvedDescription || improvedDescription.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.GENERATION_FAILED,
        'Agent failed to generate improved content'
      );
    }

    // Truncate if exceeds character limit
    if (improvedDescription.length > platformGuide.characterLimit) {
      improvedDescription = intelligentTruncate(
        improvedDescription,
        platformGuide.characterLimit
      );
    }

    // ========================================================================
    // 8. RETURN RESPONSE
    // ========================================================================
    
    return {
      success: true,
      originalDescription: input.description,
      improvedDescription: improvedDescription.trim(),
      metadata: {
        platform: input.platform,
        postType: input.postType,
        characterCount: improvedDescription.trim().length,
        timestamp: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error('Content improvement error:', error);

    // Handle specific error types
    if (error instanceof AgentError) {
      throw error;
    }

    // Handle API key errors
    if (error instanceof Error && error.message.includes('API key')) {
      throw new AgentError(
        AgentErrorType.API_KEY_INVALID,
        'Invalid OpenAI API key'
      );
    }

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new AgentError(
        AgentErrorType.RATE_LIMIT,
        'Rate limit exceeded. Please try again later.'
      );
    }

    // Generic error
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      `Failed to improve content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Intelligently truncate text to fit character limit
 * Tries to preserve complete sentences and hashtags
 */
function intelligentTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Extract hashtags if present
  const hashtagMatch = text.match(/(#\w+(\s+#\w+)*)\s*$/);
  const hashtags = hashtagMatch ? hashtagMatch[0] : '';
  const contentWithoutHashtags = hashtags ? text.replace(hashtags, '').trim() : text;

  // Calculate available space
  const availableSpace = maxLength - (hashtags ? hashtags.length + 2 : 0); // +2 for spacing

  if (availableSpace <= 0) {
    // If hashtags alone exceed limit, just truncate
    return text.substring(0, maxLength - 3) + '...';
  }

  // Try to truncate at sentence boundary
  const sentences = contentWithoutHashtags.match(/[^.!?]+[.!?]+/g) || [contentWithoutHashtags];
  let truncated = '';

  for (const sentence of sentences) {
    if ((truncated + sentence).length <= availableSpace) {
      truncated += sentence;
    } else {
      break;
    }
  }

  // If no complete sentences fit, truncate at word boundary
  if (truncated.length === 0) {
    const words = contentWithoutHashtags.split(' ');
    for (const word of words) {
      if ((truncated + ' ' + word).length <= availableSpace - 3) {
        truncated += (truncated ? ' ' : '') + word;
      } else {
        break;
      }
    }
    truncated += '...';
  }

  // Re-add hashtags if they existed
  return hashtags ? `${truncated}\n\n${hashtags}` : truncated;
}

// ============================================================================
// Batch Improvement (for future use)
// ============================================================================

/**
 * Improve multiple descriptions in batch
 * Useful for improving content across multiple platforms at once
 */
export async function improveMultipleDescriptions(
  inputs: ImproveContentRequestInput[]
): Promise<ImprovementAgentResponse[]> {
  const promises = inputs.map(input => improveContentDescription(input));
  return Promise.all(promises);
}

// ============================================================================
// Platform-Specific Quick Improvements
// ============================================================================

/**
 * Quick improvement suggestions without full LLM call
 * Useful for real-time feedback
 */
export function getQuickImprovementSuggestions(
  description: string,
  platform: Platform
): string[] {
  const suggestions: string[] = [];
  const platformGuide = PLATFORM_GUIDELINES[platform];

  // Check length
  if (description.length > platformGuide.characterLimit) {
    suggestions.push(`Reduce length to under ${platformGuide.characterLimit} characters`);
  }

  // Check hashtags
  if (platformGuide.useHashtags) {
    const hashtagCount = (description.match(/#\w+/g) || []).length;
    if (hashtagCount === 0) {
      suggestions.push('Add relevant hashtags for better discoverability');
    } else if (hashtagCount > 15) {
      suggestions.push('Consider reducing hashtags (max 10-15)');
    }
  }

  // Check emojis
  if (platformGuide.useEmojis) {
    const emojiCount = (description.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount === 0) {
      suggestions.push('Add emojis for visual appeal');
    }
  }

  // Check for call-to-action
  const ctaPatterns = /\b(click|tap|swipe|comment|share|like|follow|subscribe|visit|learn more|sign up)\b/gi;
  if (!ctaPatterns.test(description)) {
    suggestions.push('Consider adding a call-to-action');
  }

  // Platform-specific checks
  if (platform === 'twitter' && description.length < 100) {
    suggestions.push('Consider adding more context or a question');
  }

  if (platform === 'linkedin' && description.length < 300) {
    suggestions.push('LinkedIn posts perform better with more detailed content');
  }

  return suggestions;
}
