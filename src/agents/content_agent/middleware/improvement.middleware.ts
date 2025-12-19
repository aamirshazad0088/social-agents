/**
 * Content Improvement Middleware
 * 
 * Custom LangChain middleware for dynamic system prompt injection.
 * Injects platform-specific guidelines at runtime.
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */

import { createMiddleware } from 'langchain';
import * as z from 'zod';
import { PLATFORM_GUIDELINES, POST_TYPE_GUIDELINES } from '../prompts/improvement.prompts';

// ============================================================================
// Context Schema (Runtime Context)
// ============================================================================

/**
 * Zod schema for runtime context passed to agent.invoke()
 */
export const contentImprovementContextSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']),
  description: z.string(),
  postType: z.enum(['post', 'feed', 'carousel', 'reel', 'story', 'video', 'short', 'slideshow']).optional(),
  additionalInstructions: z.string().optional(),
});

export type ContentImprovementContext = z.infer<typeof contentImprovementContextSchema>;

// ============================================================================
// Dynamic System Prompt Builder
// ============================================================================

/**
 * Build dynamic system prompt from runtime context
 * 
 * Injects:
 * - PLATFORM_GUIDELINES[platform] → characterLimit, bestPractices, hashtags, emojis
 * - POST_TYPE_GUIDELINES[postType] → format-specific guidance
 */
export function buildDynamicSystemPrompt(context: ContentImprovementContext): string {
  const { platform, postType } = context;
  
  const platformGuide = PLATFORM_GUIDELINES[platform];
  const postTypeGuide = postType ? POST_TYPE_GUIDELINES[postType] : null;

  // Build post type section if provided
  const postTypeSection = postTypeGuide ? `
FORMAT: ${postType?.toUpperCase()}
${postTypeGuide.description}
Focus: ${postTypeGuide.focusAreas.join(', ')}
Tips: ${postTypeGuide.tips.join(' | ')}` : '';

  return `You are a social media copywriter. Improve the existing title/description for ${platform}${postType ? ` ${postType}` : ''}.

PLATFORM: ${platform.toUpperCase()}
Tone: ${platformGuide.tone}
Audience: ${platformGuide.audience}
Character Limit: ${platformGuide.characterLimit}
Hashtags: ${platformGuide.useHashtags ? 'Add relevant hashtags' : 'No hashtags'}
Emojis: ${platformGuide.useEmojis ? 'Use strategically' : 'Minimal'}
${postTypeSection}

BEST PRACTICES:
${platformGuide.bestPractices.map((p, i) => `${i + 1}. ${p}`).join('\n')}

HOOK TECHNIQUES: ${platformGuide.hookTechniques.join(' | ')}

CTA EXAMPLES: ${platformGuide.ctaExamples.join(' | ')}

RULES:
1. Preserve the user's core message
2. Improve clarity and engagement
3. Stay under character limit
4. Follow user instructions exactly

OUTPUT: Return ONLY the improved text. No explanations.`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

/**
 * Build simple user prompt - just the description and instructions
 * All examples and rules are already in system prompt
 */
export function buildUserPrompt(context: ContentImprovementContext): string {
  const { description, additionalInstructions } = context;
  
  if (additionalInstructions && additionalInstructions.trim().length > 0) {
    return `${description}\n\nEnhance with: ${additionalInstructions}`;
  }
  
  return description;
}

// ============================================================================
// Custom Middleware: Dynamic System Prompt
// ============================================================================

/**
 * Create dynamic system prompt middleware for content improvement
 * 
 * Uses wrapModelCall hook to inject dynamic system prompt based on runtime context.
 * Context is passed via agent.invoke(..., { context: {...} })
 */
export function createContentImprovementMiddleware() {
  return createMiddleware({
    name: 'ContentImprovementMiddleware',
    contextSchema: contentImprovementContextSchema,
    
    /**
     * wrapModelCall hook - modifies systemMessage before model call
     */
    wrapModelCall: async (request: any, handler: any) => {
      const context = request.runtime?.context as ContentImprovementContext | undefined;
      
      if (!context) {
        throw new Error('Runtime context is required for content improvement');
      }
      
      // Build dynamic system prompt from context
      const dynamicPrompt = buildDynamicSystemPrompt(context);
      
      // Append dynamic content to systemMessage
      const newSystemMessage = request.systemMessage.concat(dynamicPrompt);
      
      // Call handler with modified request and return result
      return handler({
        ...request,
        systemMessage: newSystemMessage,
      });
    },
  });
}
