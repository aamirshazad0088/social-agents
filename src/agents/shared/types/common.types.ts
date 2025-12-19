/**
 * Shared Types for All Agents
 * Common type definitions used across different agents
 */

import { Platform, Tone, ContentType } from '@/types';

// ============================================================================
// Base Agent Types
// ============================================================================

export interface BaseAgentRequest {
  timestamp?: number;
  userId?: string;
}

export interface BaseAgentResponse {
  success: boolean;
  generatedAt: number;
  generationTime?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export enum AgentErrorType {
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT = 'RATE_LIMIT',
  GENERATION_FAILED = 'GENERATION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

// ============================================================================
// Platform and Content Types (Re-exports for convenience)
// ============================================================================

export type { Platform, Tone, ContentType };
