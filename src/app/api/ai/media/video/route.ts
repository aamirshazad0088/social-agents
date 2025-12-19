import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const videoRequestSchema = z.object({
  prompt: z.string(),
  model: z.string().optional().default('sora-2'),
  size: z.string().optional().default('1280x720'),
  seconds: z.string().optional().default('8'),
});

/**
 * POST /api/ai/media/video
 * Generate a video using OpenAI Sora API
 * 
 * Request body:
 * {
 *   prompt: string
 * }
 * 
 * Returns:
 * {
 *   operation: Video object with id, status, model, progress, etc.
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = videoRequestSchema.safeParse(body);
    
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

    // Call video generation agent
    const result = await generateVideo(validation.data as any);

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
        error: error instanceof Error ? error.message : 'Failed to generate video' 
      },
      { status: 500 }
    );
  }
}
