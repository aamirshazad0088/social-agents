/**
 * Content Agent - Main Export
 * Central export point for all content agent functionality
 * 
 * Uses LangChain createAgent with custom middleware for dynamic system prompts.
 * 
 * @see https://docs.langchain.com/oss/javascript/langchain/agents
 * @see https://docs.langchain.com/oss/javascript/langchain/middleware/custom
 */

// Services (Sub-agents)
export { contentStrategistChat } from './services/chat.service';
export { scriptTools } from './services/script.tools';
export { improveContentDescription, improveMultipleDescriptions, getQuickImprovementSuggestions } from './services/improvement.service';

// Voice Agent Service (Gemini Live API)
export { createVoiceSession, ContentVoiceSession, type VoiceSessionCallbacks, type VoiceSessionConfig } from './services/voice.service';

// Middleware
export {
  createContentImprovementMiddleware,
  buildDynamicSystemPrompt,
  buildUserPrompt,
  contentImprovementContextSchema,
  type ContentImprovementContext,
} from './middleware/improvement.middleware';

// Types
export * from './types/content.types';
export * from './types/improvement.types';

// Schemas
export * from './schemas/content.schemas';
export * from './schemas/businessContext.schema';
export * from './schemas/improvement.schemas';

// Prompts
export * from './prompts/content.prompts';
export * from './prompts/improvement.prompts';

// ============================================================================
// Scripts Agent - Platform-Specific Script Generators
// ============================================================================
export * from './scripts_agent';
