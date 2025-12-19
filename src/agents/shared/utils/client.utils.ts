/**
 * Shared Client Utilities
 * Lazy initialization and management of AI clients
 */

import OpenAI from 'openai';
import { Agent } from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';
import { GoogleGenAI } from '@google/genai';
import { AgentError, AgentErrorType } from '../types/common.types';

// ============================================================================
// OpenAI Client Management
// ============================================================================

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        AgentErrorType.API_KEY_INVALID,
        'OPENAI_API_KEY environment variable is not set'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// Gemini Client Management
// ============================================================================

let geminiClient: OpenAI | null = null;
let geminiModel: OpenAIChatCompletionsModel | null = null;

export function getGeminiClient(): { client: OpenAI; model: OpenAIChatCompletionsModel } {
  if (!geminiClient || !geminiModel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        AgentErrorType.API_KEY_INVALID,
        'GEMINI_API_KEY environment variable is not set'
      );
    }

    geminiClient = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    geminiModel = new OpenAIChatCompletionsModel(geminiClient, 'gemini-2.0-flash');
  }

  return { client: geminiClient, model: geminiModel };
}

export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AgentError(
      AgentErrorType.API_KEY_INVALID,
      'GEMINI_API_KEY environment variable is not set'
    );
  }
  return apiKey;
}

// ============================================================================
// Google GenAI Client Management (for Veo 3.1)
// ============================================================================

let googleGenAIClient: GoogleGenAI | null = null;

/**
 * Get Google GenAI client for Veo 3.1 video generation
 * Uses the GEMINI_API_KEY environment variable
 */
export function getGoogleGenAIClient(): GoogleGenAI {
  if (!googleGenAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        AgentErrorType.API_KEY_INVALID,
        'GEMINI_API_KEY environment variable is not set'
      );
    }
    googleGenAIClient = new GoogleGenAI({ apiKey });
  }
  return googleGenAIClient;
}

// ============================================================================
// Client Reset (for testing)
// ============================================================================

export function resetClients(): void {
  openaiClient = null;
  geminiClient = null;
  geminiModel = null;
  googleGenAIClient = null;
}
