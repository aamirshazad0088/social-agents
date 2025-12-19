/**
 * Dynamic System Prompt Middleware
 * 
 * Custom LangChain middleware that injects dynamic system prompt based on runtime context.
 * Uses wrapModelCall hook to modify systemMessage with media-specific guidelines.
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 * @see https://docs.langchain.com/oss/javascript/langchain/context-engineering
 */

import { createMiddleware } from 'langchain';
import * as z from 'zod';
import { 
  MEDIA_TYPE_GUIDELINES, 
  SUBTYPE_GUIDELINES, 
  PROVIDER_OPTIMIZATIONS 
} from '../prompts/promptImprovement.prompts';

// ============================================================================
// Context Schema (Runtime Context)
// ============================================================================

/**
 * Zod schema for runtime context passed to agent.invoke()
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/context-engineering#runtime-context
 */
export const promptImprovementContextSchema = z.object({
  mediaType: z.enum(['image-generation', 'image-editing', 'video-generation', 'video-editing']),
  originalPrompt: z.string(),
  mediaSubType: z.enum([
    'text-to-image', 'text-to-video', 'image-to-video', 
    'inpaint', 'reference', 'gemini-edit', 'multi-turn', 
    'video-extend', 'frame-specific'
  ]).optional(),
  provider: z.enum(['openai', 'google']).optional(),
  model: z.string().optional(),
  userInstructions: z.string().optional(),
});

export type PromptImprovementContext = z.infer<typeof promptImprovementContextSchema>;

// ============================================================================
// Dynamic System Prompt Builder
// ============================================================================

/**
 * Build dynamic system prompt from runtime context
 * 
 * Injects:
 * - MEDIA_TYPE_GUIDELINES[mediaType] → focusAreas, technicalTerms, styleGuidance
 * - SUBTYPE_GUIDELINES[mediaSubType] → context, promptElements, tips, examplePrompt
 * - PROVIDER_OPTIMIZATIONS[provider] → strengths, tips
 */
export function buildDynamicSystemPrompt(context: PromptImprovementContext): string {
  const { mediaType, mediaSubType, provider, model } = context;
  
  // 1. Get base guidelines for media type
  const guidelines = MEDIA_TYPE_GUIDELINES[mediaType];
  
  // 2. Get provider-specific optimizations
  const providerInfo = provider ? PROVIDER_OPTIMIZATIONS[provider] : null;
  
  // 3. Get subtype-specific guidelines
  const subtypeInfo = mediaSubType ? SUBTYPE_GUIDELINES[mediaSubType] : null;
  
  // 4. Convert mediaType to camelCase key (e.g., 'image-generation' -> 'imageGeneration')
  const mediaTypeKey = mediaType.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  
  // 5. Build provider context section
  const providerContext = providerInfo
    ? `

PROVIDER: ${provider?.toUpperCase()}
${model ? `Model: ${model}` : ''}
Provider strengths: ${JSON.stringify(providerInfo[mediaTypeKey]?.strengths || [])}
Optimization tips: ${JSON.stringify(providerInfo[mediaTypeKey]?.tips || [])}`
    : '';

  // 6. Build subtype context section
  const subtypeContext = subtypeInfo
    ? `

SPECIFIC MODE: ${mediaSubType?.replace(/-/g, ' ').toUpperCase()}
Context: ${subtypeInfo.context}
${subtypeInfo.promptElements ? `
PROMPT ELEMENTS TO INCLUDE:
${subtypeInfo.promptElements.map(el => `- ${el}`).join('\n')}` : ''}
${subtypeInfo.tips ? `
MODE-SPECIFIC TIPS:
${subtypeInfo.tips.map(tip => `- ${tip}`).join('\n')}` : ''}
${subtypeInfo.examplePrompt ? `
EXAMPLE OF EXCELLENT PROMPT:
"${subtypeInfo.examplePrompt}"` : ''}`
    : '';

  // 7. Return complete dynamic system prompt
  return `You are a world-class AI prompt engineer specializing in ${mediaType.replace('-', ' ')}.
Your expertise includes ${guidelines.examples}.

Your task is to transform basic user prompts into professional, detailed, production-ready prompts that will produce stunning ${mediaType.includes('image') ? 'visuals' : 'videos'}.

FOCUS AREAS:
${guidelines.focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}

TECHNICAL VOCABULARY TO INCORPORATE:
${guidelines.technicalTerms.map(term => `- ${term}`).join('\n')}

STYLE GUIDANCE:
${guidelines.styleGuidance.map(style => `- ${style}`).join('\n')}${providerContext}${subtypeContext}

QUALITY STANDARDS:
- Vivid, specific, production-ready descriptions
- Professional terminology and technical accuracy
- Clear visual or cinematic language optimized for AI generation
- Aim for ${guidelines.maxLength} chars max

<solution_persistence>
You are an autonomous prompt engineer. Execute immediately without asking questions or seeking confirmation.
- Be extremely biased for action - make sensible assumptions about missing details and proceed
- Never ask clarifying questions - infer intent and deliver the improved prompt
- Never explain what you did or why - just output the result
- Never output meta-commentary like "here's your prompt" or "I've improved this by..."
</solution_persistence>

<output_format>
Write prompts as DIRECT SCENE DESCRIPTIONS - what the AI will render, NOT instructions to the AI.

FORBIDDEN PATTERNS (never use):
- "Create...", "Generate...", "Make...", "Produce..."
- "I want you to...", "Please...", "Can you..."
- "This should be...", "It needs to..."
- Questions of any kind

REQUIRED PATTERN:
- Direct descriptive language: "A woman walking...", "Urban street at dawn...", "Professional product shot of..."
- For video: Structured sections (Format, Lenses, Grade, Lighting, Location, Subject, Sound, Shot breakdown)
- For images: Flowing description with composition, lighting, lens, colors, mood, aspect ratio
</output_format>

CORE RULES:
1. Preserve the user's core concept and intent
2. Transform ANY input format into direct descriptive output
3. Use industry-standard terminology for the target platform
4. Be specific: lighting, camera, colors, mood, composition, sound (video)
5. Natural, readable prose or structured sections - no bullet lists in final prompt

OUTPUT: Return ONLY the improved prompt text. No JSON, no explanations, no meta-commentary.`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

/**
 * Build simple user prompt - just the original prompt and instructions
 * All examples and rules are already in system prompt via middleware
 */
export function buildUserPrompt(context: PromptImprovementContext): string {
  const { originalPrompt, userInstructions } = context;
  
  if (userInstructions) {
    return `${originalPrompt}\n\nEnhance with: ${userInstructions}`;
  }
  
  return originalPrompt;
}

// ============================================================================
// Custom Middleware: Dynamic System Prompt
// ============================================================================

/**
 * Create dynamic system prompt middleware
 * 
 * Uses wrapModelCall hook to inject dynamic system prompt based on runtime context.
 * Context is passed via agent.invoke(..., { context: {...} })
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */
export function createDynamicPromptMiddleware() {
  return createMiddleware({
    name: 'DynamicSystemPromptMiddleware',
    contextSchema: promptImprovementContextSchema,
    
    /**
     * wrapModelCall hook - modifies systemMessage before model call
     * 
     * @param request - Contains systemMessage, messages, runtime with context
     * @param handler - Function to call with modified request
     * @returns AIMessage from handler
     */
    wrapModelCall: async (request: any, handler: any) => {
      // Access runtime context passed via agent.invoke()
      const context = request.runtime?.context as PromptImprovementContext | undefined;
      
      if (!context) {
        throw new Error('Runtime context is required for prompt improvement');
      }
      
      // Build dynamic system prompt from context
      const dynamicPrompt = buildDynamicSystemPrompt(context);
      
      // Append dynamic content to systemMessage using .concat()
      // This preserves the SystemMessage structure
      const newSystemMessage = request.systemMessage.concat(dynamicPrompt);
      
      // Call handler with modified request and return result
      return handler({
        ...request,
        systemMessage: newSystemMessage,
      });
    },
  });
}
