/**
 * Dynamic Model Utilities
 * Direct model instantiation for reliable model creation
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';

// Model allowlist for security
export const MODEL_ALLOWLIST = new Set([
  // OpenAI Models
  'openai:gpt-5.2',
  'openai:gpt-5.1',
  // Anthropic Models
  'anthropic:claude-sonnet-4-5-20250929',
  'anthropic:claude-opus-4-5-20251101',
  'anthropic:claude-haiku-4-5-20251001',
  // Google Models
  'google-genai:gemini-3-pro-preview',
  'google-genai:gemini-3-flash-preview',
  'google-genai:gemini-2.5-pro',
  // Groq Models
  'groq:llama-3.3-70b-versatile',
  'groq:llama-3.1-8b-instant',
]);

export type ModelProvider = 'openai' | 'anthropic' | 'google-genai' | 'groq';

export const DEFAULT_MODEL_ID = 'google-genai:gemini-3-flash-preview';

// Validate model is in allowlist
export function validateModelId(modelId: string): void {
  if (!MODEL_ALLOWLIST.has(modelId)) {
    throw new Error(`Model not allowed: ${modelId}`);
  }
}

// Create a dynamic model instance using direct instantiation
export async function createDynamicModel(modelId: string): Promise<BaseChatModel> {
  const resolvedModelId = modelId || DEFAULT_MODEL_ID;

  validateModelId(resolvedModelId);

  const [provider, ...modelParts] = resolvedModelId.split(':');
  const modelName = modelParts.join(':');

  console.log('[createDynamicModel] Provider:', provider, 'Model:', modelName);

  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        model: modelName,
        apiKey: process.env.OPENAI_API_KEY,
      });

    case 'anthropic':
      return new ChatAnthropic({
        model: modelName,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

    case 'google-genai':
      return new ChatGoogleGenerativeAI({
        model: modelName,
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      });

    case 'groq':
      return new ChatGroq({
        model: modelName,
        apiKey: process.env.GROQ_API_KEY,
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
