/**
 * Media Prompt Improvement Agent Service
 * 
 * LangChain-based agent for improving AI generation prompts.
 * Uses custom middleware for dynamic system prompt injection.
 * 
 * ARCHITECTURE:
 * - LangChain createAgent with custom middleware
 * - Dynamic system prompt via wrapModelCall hook
 * - Runtime context for media-specific guidelines
 * - Returns simple AI message (no structured output)
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/agents
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */

import { createAgent } from 'langchain';
import { 
  ImprovePromptRequestInput,
  PromptImprovementResponse,
} from '../schemas/promptImprovement.schemas';
import { MEDIA_TYPE_GUIDELINES } from '../prompts/promptImprovement.prompts';
import { 
  createDynamicPromptMiddleware,
  buildUserPrompt,
  promptImprovementContextSchema,
  PromptImprovementContext,
} from '../middleware/dynamicPrompt.middleware';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import { createDynamicModel, DEFAULT_MODEL_ID } from '@/agents/shared';

// ============================================================================
// Agent Configuration
// ============================================================================

const DEFAULT_MODEL = DEFAULT_MODEL_ID;

// ============================================================================
// Main Improvement Service
// ============================================================================

/**
 * Improve media generation prompt using LangChain agent with custom middleware
 * 
 * FLOW:
 * 1. Validate input
 * 2. Build runtime context
 * 3. Create model instance
 * 4. Create agent with middleware (dynamic system prompt)
 * 5. Invoke with runtime context
 * 6. Return structured response
 * 
 * @param input - Improvement request with prompt, media type, and context
 * @returns Improved prompt with analysis
 */
export async function improveMediaPrompt(
  input: ImprovePromptRequestInput
): Promise<PromptImprovementResponse> {
  const startTime = Date.now();

  try {
    // ========================================================================
    // 1. VALIDATE INPUT
    // ========================================================================
    
    if (!input.originalPrompt || input.originalPrompt.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Original prompt is required'
      );
    }

    const mediaGuidelines = MEDIA_TYPE_GUIDELINES[input.mediaType];
    if (!mediaGuidelines) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        `Invalid media type: ${input.mediaType}`
      );
    }

    // ========================================================================
    // 2. BUILD RUNTIME CONTEXT
    // ========================================================================
    
    const runtimeContext: PromptImprovementContext = {
      mediaType: input.mediaType,
      originalPrompt: input.originalPrompt,
      mediaSubType: input.mediaSubType,
      provider: input.provider,
      model: input.model,
      userInstructions: input.userInstructions,
    };

    // ========================================================================
    // 3. BUILD USER PROMPT
    // ========================================================================
    
    const userPrompt = buildUserPrompt(runtimeContext);

    // ========================================================================
    // 4. CREATE MODEL INSTANCE (Dynamic model selection)
    // ========================================================================
    
    const modelId = input.modelId || DEFAULT_MODEL;
    const model = await createDynamicModel(modelId);

    // ========================================================================
    // 5. CREATE AGENT WITH CUSTOM MIDDLEWARE
    // ========================================================================
    
    /**
     * Agent uses custom middleware for dynamic system prompt:
     * - Middleware reads runtime.context at invoke time
     * - wrapModelCall modifies systemMessage with dynamic content
     * - Injects: MEDIA_TYPE_GUIDELINES, SUBTYPE_GUIDELINES, PROVIDER_OPTIMIZATIONS
     * 
     * No responseFormat = returns simple AI message
     * 
     * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
     */
    const agent = createAgent({
      model,
      tools: [],
      systemPrompt: 'You are a professional prompt engineer.',  // Base prompt (middleware appends to this)
      contextSchema: promptImprovementContextSchema,
      middleware: [createDynamicPromptMiddleware()],
    });

    // ========================================================================
    // 6. INVOKE WITH RUNTIME CONTEXT
    // ========================================================================
    
    /**
     * Pass runtime context to agent.invoke()
     * Middleware accesses it via request.runtime.context
     * 
     * @see https://docs.langchain.com/oss/javascript/langchain/context-engineering#runtime-context
     */
    const result = await agent.invoke(
      { messages: [{ role: 'user' as const, content: userPrompt }] },
      { context: runtimeContext }
    );

    // ========================================================================
    // 7. EXTRACT AI MESSAGE CONTENT
    // ========================================================================
    
    // Get the last message (AI response)
    const lastMessage = result.messages[result.messages.length - 1];
    const improvedPrompt = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : String(lastMessage.content);
    
    if (!improvedPrompt || improvedPrompt.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.GENERATION_FAILED,
        'Agent failed to generate improved prompt'
      );
    }

    // ========================================================================
    // 8. RETURN RESPONSE
    // ========================================================================
    
    return {
      success: true,
      improvedPrompt: improvedPrompt.trim(),
      originalPrompt: input.originalPrompt,
      mediaType: input.mediaType,
      processingTime: Date.now() - startTime,
    };

  } catch (error) {
    console.error('Prompt improvement error:', error);

    // Handle specific error types
    if (error instanceof AgentError) {
      throw error;
    }

    // Handle API key errors
    if (error instanceof Error && error.message.includes('API key')) {
      throw new AgentError(
        AgentErrorType.API_KEY_INVALID,
        'OpenAI API key is not configured'
      );
    }

    // Handle rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new AgentError(
        AgentErrorType.RATE_LIMIT,
        'Rate limit exceeded. Please try again later.'
      );
    }

    // Generic error
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to improve prompt'
    );
  }
}


