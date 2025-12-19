/**
 * Media Prompt Improvement API Endpoint
 * POST /api/ai/media/prompt/improve
 * 
 * Improves AI generation prompts for images and videos
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  improveMediaPrompt,
  improvePromptRequestSchema,
  type PromptImprovementResponse,
} from '@/agents/media_prompt_agent';
import { AgentError } from '@/agents/shared/types/common.types';

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedInput = improvePromptRequestSchema.parse(body);

    // Call improvement service
    const result = await improveMediaPrompt(validatedInput);

    // Return success response
    return NextResponse.json<PromptImprovementResponse>({
      success: true,
      improvedPrompt: result.improvedPrompt,
      improvements: result.improvements,
      suggestions: result.suggestions,
      technicalDetails: result.technicalDetails,
      originalPrompt: result.originalPrompt,
      mediaType: result.mediaType,
      processingTime: result.processingTime,
    });

  } catch (error) {
    console.error('Prompt improvement API error:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Handle agent errors
    if (error instanceof AgentError) {
      const statusCode = getStatusCodeForAgentError(error.type);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: statusCode }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Prompt improvement failed',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler (Health Check)
// ============================================================================

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Media Prompt Improvement API is running',
    version: '1.0.0',
    supportedMediaTypes: [
      'image-generation',
      'image-editing',
      'video-generation',
      'video-editing'
    ],
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map AgentErrorType to HTTP status code
 */
function getStatusCodeForAgentError(errorType: string): number {
  switch (errorType) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'API_KEY_INVALID':
      return 500;
    case 'RATE_LIMIT':
      return 429;
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 503;
    default:
      return 500;
  }
}
