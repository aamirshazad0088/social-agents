/**
 * Content Improvement Agent Types
 * TypeScript type definitions for content improvement operations
 */

import { Platform, PostType } from '@/types';

// ============================================================================
// Agent Configuration Types
// ============================================================================

/**
 * Configuration for content improvement agent
 */
export interface ImprovementAgentConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
}

// ============================================================================
// Platform-Specific Types
// ============================================================================

/**
 * Platform-specific optimization rules
 */
export interface PlatformOptimizationRules {
  platform: Platform;
  characterLimit: number;
  useHashtags: boolean;
  useEmojis: boolean;
  preferredTone: string[];
  keyElements: string[];
}

/**
 * Post type specific guidelines
 */
export interface PostTypeGuidelines {
  postType: PostType;
  description: string;
  recommendedLength: string;
  focusAreas: string[];
}

// ============================================================================
// Improvement Context Types
// ============================================================================

/**
 * Context provided to improvement agent
 */
export interface ImprovementContext {
  description: string;
  platform: Platform;
  postType?: PostType;
  additionalInstructions?: string;
}

/**
 * Improvement analysis result
 */
export interface ImprovementAnalysis {
  originalLength: number;
  improvedLength: number;
  improvementsMade: string[];
  platformOptimizations: string[];
  engagementScore?: number;
}

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * State maintained by improvement agent during processing
 */
export interface ImprovementAgentState {
  input: ImprovementContext;
  platformRules: PlatformOptimizationRules;
  postTypeGuidelines?: PostTypeGuidelines;
  improvedContent?: string;
  analysis?: ImprovementAnalysis;
  error?: string;
}
