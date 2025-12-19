/**
 * Media Prompt Improvement Agent
 * Entry point for media prompt improvement functionality
 * 
 * Uses LangChain createAgent with custom middleware for dynamic system prompts.
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/agents
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */

// Services
export { improveMediaPrompt } from './services/promptImprovement.service';

// Middleware
export {
  createDynamicPromptMiddleware,
  buildDynamicSystemPrompt,
  buildUserPrompt,
  promptImprovementContextSchema,
  type PromptImprovementContext,
} from './middleware/dynamicPrompt.middleware';

// Schemas
export {
  improvePromptRequestSchema,
  ImprovedPromptSchema,
  type ImprovePromptRequestInput,
  type ImprovedPrompt,
  type PromptImprovementResponse,
} from './schemas/promptImprovement.schemas';

// Types
export type {
  MediaType,
  MediaSubType,
  MediaProvider,
  PromptImprovementAgentConfig,
  MediaTypeGuidelines,
  ProviderOptimizationRules,
  PromptAnalysis,
  ImprovementContext,
} from './types/promptImprovement.types';

// Prompts & Guidelines
export {
  MEDIA_TYPE_GUIDELINES,
  SUBTYPE_GUIDELINES,
  PROVIDER_OPTIMIZATIONS,
  getPromptImprovementSystemPrompt,
  getPromptImprovementUserPrompt,
} from './prompts/promptImprovement.prompts';
