import { NextRequest, NextResponse } from 'next/server';
import { checkVideoStatus } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const videoStatusRequestSchema = z.object({
  videoId: z.string(),
});

/**
 * POST /api/ai/media/video/status
 * Check the status of a video generation job (OpenAI Sora)
 * 
 * Request body:
 * {
 *   videoId: string (the video ID from Sora video generation)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = videoStatusRequestSchema.safeParse(body);
    
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

    // Call video status agent
    const result = await checkVideoStatus(validation.data);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 : 
                        error.type === 'RATE_LIMIT' ? 429 : 500;
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check video status' 
      },
      { status: 500 }
    );
  }
}
