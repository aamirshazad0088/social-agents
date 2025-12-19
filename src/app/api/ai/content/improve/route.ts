/**
 * Content Improvement API Endpoint
 * POST /api/ai/content/improve
 * 
 * Uses LangChain-based improvement agent to enhance social media content
 * descriptions with platform-specific optimizations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { improveContentDescription } from '@/agents/content_agent/services/improvement.service';
import { improveContentRequestSchema } from '@/agents/content_agent/schemas/improvement.schemas';
import { AgentError } from '@/agents/shared/types/common.types';

/**
 * POST /api/ai/content/improve
 * Improve social media content description using AI
 * 
 * Request body:
 * {
 *   description: string,           // Current content description
 *   platform: Platform,             // Target social media platform
 *   postType?: PostType,            // Type of post (reel, story, carousel, etc.)
 *   additionalInstructions?: string // Optional user-provided guidance
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   originalDescription: string,
 *   improvedDescription: string,
 *   improvements: string[],         // List of improvements made
 *   hashtags: string[],              // Suggested hashtags
 *   metadata: {
 *     platform: string,
 *     postType?: string,
 *     characterCount: number,
 *     timestamp: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = improveContentRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    // Call improvement agent
    const result = await improveContentDescription(validation.data);

    // Return successful response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Content improvement API error:', error);
    
    // Handle AgentError with specific status codes
    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 : 
                        error.type === 'RATE_LIMIT' ? 429 :
                        error.type === 'VALIDATION_ERROR' ? 400 : 500;
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: statusCode }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to improve content' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/content/improve
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Content Improvement API is operational',
    version: '1.0.0',
    supportedPlatforms: [
      'instagram',
      'facebook',
      'twitter',
      'linkedin',
      'tiktok',
      'youtube'
    ],
    supportedPostTypes: [
      'post',
      'feed',
      'carousel',
      'reel',
      'story',
      'video',
      'short',
      'slideshow'
    ]
  });
}
