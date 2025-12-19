/**
 * API Route: Video Remix
 * Remix an existing video with a new prompt
 * Per OpenAI docs: POST /v1/videos/{previous_video_id}/remix
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/agents/shared/utils/client.utils';
import { z } from 'zod';

const remixRequestSchema = z.object({
  previousVideoId: z.string().min(1, 'Previous video ID is required'),
  prompt: z.string().min(1, 'Remix prompt is required'),
});

/**
 * POST /api/ai/media/video/remix
 * Remix an existing video with targeted adjustments
 * 
 * Request body:
 * {
 *   previousVideoId: string - The ID of the completed video to remix
 *   prompt: string - New prompt describing the specific change
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   videoId: string - New remixed video ID
 *   status: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = remixRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { previousVideoId, prompt } = validation.data;


    const openai = getOpenAIClient();

    // Call the remix endpoint
    // Per docs: POST /v1/videos/{previous_video_id}/remix
    const response = await (openai as any).videos.remix(previousVideoId, {
      prompt,
    });


    return NextResponse.json({
      success: true,
      videoId: response.id,
      status: response.status,
      originalVideoId: previousVideoId,
      createdAt: response.created_at,
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remix video',
      },
      { status: 500 }
    );
  }
}
