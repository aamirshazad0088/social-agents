/**
 * Media Prompt Improvement Agent Types
 * TypeScript type definitions for prompt improvement operations
 */

// ============================================================================
// Core Types
// ============================================================================

export type MediaType = 
  | 'image-generation'
  | 'image-editing'
  | 'video-generation'
  | 'video-editing';

export type MediaSubType = 
  | 'text-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'inpaint'
  | 'reference'
  | 'gemini-edit'
  | 'multi-turn'
  | 'video-extend'
  | 'frame-specific';

export type MediaProvider = 'openai' | 'google';

// ============================================================================
// Context and Configuration
// ============================================================================

/**
 * Additional context about the media generation request
 */
export interface PromptImprovementContext {
  platform?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  hasReferenceImage?: boolean;
  editMode?: string;
}

/**
 * Configuration for prompt improvement agent
 */
export interface PromptImprovementAgentConfig {
  model: string;
  temperature?: number;
  maxRetries?: number;
}

// ============================================================================
// Guidelines and Rules
// ============================================================================

/**
 * Media type-specific optimization guidelines
 */
export interface MediaTypeGuidelines {
  focusAreas: string[];
  technicalTerms: string[];
  styleGuidance: string[];
  examples: string;
  maxLength?: number;
}

/**
 * Provider-specific optimization rules
 */
export interface ProviderOptimizationRules {
  provider: MediaProvider;
  model: string;
  maxPromptLength: number;
  supportsStructuredPrompts: boolean;
  preferredStyle: string;
  technicalFocus: string[];
  bestPractices: string[];
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Analysis of the original prompt
 */
export interface PromptAnalysis {
  hasComposition: boolean;
  hasLighting: boolean;
  hasStyle: boolean;
  hasTechnicalDetails: boolean;
  hasMotion?: boolean;
  hasTiming?: boolean;
  clarity: 'low' | 'medium' | 'high';
  specificity: 'low' | 'medium' | 'high';
}

/**
 * Improvement context combining all information
 */
export interface ImprovementContext {
  originalPrompt: string;
  mediaType: MediaType;
  mediaSubType?: MediaSubType;
  provider?: MediaProvider;
  model?: string;
  userInstructions?: string;
  context?: PromptImprovementContext;
  analysis?: PromptAnalysis;
}
