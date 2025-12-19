/**
 * Comment Agent - Main Export
 * AI-powered personal assistant for social media comment management
 * 
 * Features:
 * - Searches company knowledge base before responding
 * - Auto-replies when confident with relevant knowledge
 * - Escalates to user when human expertise is needed
 * - Prevents duplicate replies and escalations
 * - Runs on cron schedule or manually triggered
 */

// Main service
export { processComments } from './services/comment.service';

// Types
export * from './types/comment.types';

// Memory
export { getCommentAgentMemory, isMemoryAvailable } from './services/memory.service';

// Tools
export {
  createFetchTools,
  createKnowledgeTools,
  createReplyTools,
  createEscalateTools,
} from './tools';

// Prompts
export { getCommentAgentSystemPrompt } from './prompts/comment.prompts';
