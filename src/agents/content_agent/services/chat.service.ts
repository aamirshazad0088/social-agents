/**
 * Content Strategy Supervisor Service
 * 
 * Expert multi-platform content strategist using LangChain's structured output.
 * 
 * Workflow: CONSULT → CONFIRM → GENERATE → DELIVER
 * 
 * Response Modes:
 * - ConversationalResponse: { message: string } - For chatting and gathering info
 * - ContentGeneration: { contents: [...] } - For delivering generated content
 * 
 * Output Format: { contents: [{ platform, contentType, format?, title?, description?, imagePrompt/videoPrompt }] }
 */
import { randomUUID } from 'crypto';
import { createAgent, toolStrategy } from 'langchain';
import * as z from 'zod';
import { PLATFORMS } from '@/constants';
import { ChatStrategistRequest, ChatStrategistResponse } from '../types/content.types';
import { getUnifiedSupervisorSystemInstruction } from '../prompts/content.prompts';
import { getContentAgentMemory } from './memory.service';
import { createMemoryTools } from './memory.tools';
import { scriptTools } from './script.tools';
import { detectFileType, getImageDataUrl, getMimeType, loadDocument } from '../utils/documentLoader';
import { BusinessContextSchema, formatBusinessContextForPrompt } from '../schemas/businessContext.schema';
import { createDynamicModel, DEFAULT_MODEL_ID } from '@/agents/shared';

// ============================================================================
// STRUCTURED OUTPUT SCHEMAS
// ============================================================================

/**
 * Platform Content Schema
 * Defines structure for each platform's content
 * Supports both single images/videos and carousels
 */
const PlatformContentSchema = z.object({
  platform: z.string().describe('Target social media platform name. Must be lowercase (e.g., instagram, tiktok, facebook, youtube, linkedin, twitter)'),
  contentType: z.enum(['image', 'video']).describe('Type of content to generate. Use "image" for static visual content (posts, carousels) or "video" for motion content (reels, shorts)'),
  title: z.string().describe('Catchy title, headline, or hook for the content. Should grab attention and be platform-appropriate. Keep it short (3-10 words)'),
  description: z.string().describe('Engaging description, caption, or post text that matches the specified tone and content type. Include 3-5 relevant hashtags if appropriate. For carousels, this is the main caption for all slides'),
  prompt: z.string().describe('Detailed AI generation prompt that will be sent to image/video generators like Midjourney, Runway, or DALL-E. CRITICAL FORMATTING RULES:\n\n1. SINGLE IMAGE/VIDEO: Provide one detailed prompt ending with aspect ratio (--ar 4:5, --ar 9:16, or --ar 16:9)\n   Example: "Modern office desk with laptop, coffee, morning sunlight, professional aesthetic --ar 4:5"\n\n2. CAROUSELS (Multiple Slides): Must follow this EXACT format:\n   "CAROUSEL - X SLIDES:\n\nSlide 1: [complete detailed prompt with style, composition, colors] --ar 4:5\n\nSlide 2: [complete detailed prompt with style, composition, colors] --ar 4:5\n\nSlide 3: [complete detailed prompt with style, composition, colors] --ar 4:5"\n\n   RULES FOR CAROUSELS:\n   - Start with "CAROUSEL - X SLIDES:" where X is the number\n   - Each slide MUST be on a new line with double line breaks (\\n\\n)\n   - Format: "Slide N:" followed by complete prompt and --ar ratio\n   - Each slide needs its own detailed, unique prompt\n   - Always include aspect ratio (--ar 4:5 for Instagram, --ar 16:9 for YouTube)\n   - Be specific about visual elements, colors, text placement, style for each slide'),
});

/**
 * Conversational Response Schema
 * Used when chatting or gathering information from the user
 */
const ConversationalResponseSchema = z.object({
  message: z.string().describe('expert, conversational message to the user. Use this when gathering information, asking questions, or having a dialogue. Be helpful, warm, and ask one question at a time'),
});

/**
 * Content Generation Response Schema
 * Used when generating platform-specific content
 */
const ContentGenerationSchema = z.object({
  contents: z.array(PlatformContentSchema).describe('Array of platform-specific content. Each item represents content tailored for a specific social media platform. Include one item per requested platform'),
});

type ConversationalResponse = z.infer<typeof ConversationalResponseSchema>;
type ContentGeneration = z.infer<typeof ContentGenerationSchema>;
type AgentResponse = ConversationalResponse | ContentGeneration;

export async function contentStrategistChat(
  request: ChatStrategistRequest
): Promise<ChatStrategistResponse> {
  const startTime = Date.now();
  const { message, threadId, attachments, businessContext, modelId } = request;
  const platformList = PLATFORMS.map((p) => p.id).join(', ');

  const { checkpointer, store } = await getContentAgentMemory();
  const memoryTools = createMemoryTools(store, {
    userId: request.userId,
  });

  // Check if any attachments are images for vision model
  const hasImages = attachments?.some(a => detectFileType(a) === 'image') || false;
  
  // Use dynamic model selection - default to gpt-4o for vision support
  const resolvedModelId = modelId || (hasImages ? 'openai:gpt-4o' : DEFAULT_MODEL_ID);
  const model = await createDynamicModel(resolvedModelId);

  // Build system prompt with business context (LangChain runtime context pattern)
  const basePrompt = getUnifiedSupervisorSystemInstruction(platformList);
  const businessContextPrompt = formatBusinessContextForPrompt(businessContext);
  const unifiedSupervisorPrompt = basePrompt + businessContextPrompt;

  const agent = createAgent({
    model,
    tools: [...memoryTools, ...scriptTools],
    systemPrompt: unifiedSupervisorPrompt,
    checkpointer,
    store,
    responseFormat: toolStrategy([ConversationalResponseSchema, ContentGenerationSchema]),
  });

  const resolvedThreadId = threadId || randomUUID();

  // Process attachments and create multimodal message content
  let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  
  if (attachments && attachments.length > 0) {
    // Build multimodal content array
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: message }
    ];

    // Process each attachment
    for (const attachment of attachments) {
      const fileType = detectFileType(attachment);
      
      if (fileType === 'image') {
        // Add image for vision model - use proper OpenAI format
        const imageUrl = getImageDataUrl(attachment);
        
        contentParts.push({
          type: 'image_url',
          image_url: { url: imageUrl },
        });
      } else {
        // Load document content and add as text
        try {
          const docContent = await loadDocument(attachment);
          
          contentParts.push({
            type: 'text',
            text: `\n\n--- Attached Document: ${attachment.name} ---\n${docContent}`,
          });
        } catch (error) {
          contentParts.push({
            type: 'text',
            text: `\n\n[Error loading ${attachment.name}]`,
          });
        }
      }
    }

    messageContent = contentParts;
  } else {
    messageContent = message;
  }

  const result = await agent.invoke(
    { 
      messages: [{ role: 'user' as const, content: messageContent }]
    },
    {
      configurable: {
        thread_id: resolvedThreadId,
      },
    }
  );
  
  const structuredResponse = result.structuredResponse as AgentResponse | undefined;
  const finalOutput = result.messages[result.messages.length - 1];
  const conversationalResponse =
    typeof finalOutput.content === 'string'
      ? finalOutput.content
      : JSON.stringify(finalOutput.content);

  if (structuredResponse) {
    // Check if it's ContentGenerationSchema (has 'contents' field)
    if ('contents' in structuredResponse) {
      return {
        success: true,
        response: conversationalResponse,
        contentGenerated: true,
        generatedContent: { contents: structuredResponse.contents },
        threadId: resolvedThreadId,
        generatedAt: Date.now(),
        generationTime: Date.now() - startTime,
      };
    }
    
    // It's ConversationalResponseSchema (has 'message' field)
    if ('message' in structuredResponse) {
      return {
        success: true,
        response: structuredResponse.message,
        threadId: resolvedThreadId,
        generatedAt: Date.now(),
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Fallback
  return {
    success: true,
    response: conversationalResponse,
    threadId: resolvedThreadId,
    generatedAt: Date.now(),
    generationTime: Date.now() - startTime,
  };
}
