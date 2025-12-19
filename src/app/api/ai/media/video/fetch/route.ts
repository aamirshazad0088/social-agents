import { NextRequest, NextResponse } from 'next/server';
import { downloadVideo } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const videoDownloadRequestSchema = z.object({
  videoId: z.string(),
});

/**
 * POST /api/ai/media/video/fetch
 * Download a completed video from OpenAI Sora
 * 
 * Request body:
 * {
 *   videoId: string (the video ID from Sora generation)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod schema
    const validation = videoDownloadRequestSchema.safeParse(body);
    
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

    // Call video download agent
    const result = await downloadVideo(validation.data);

    // Return video buffer as downloadable file
    return new Response(new Uint8Array(result.videoBuffer), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${validation.data.videoId}.mp4"`,
      },
    });
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
        error: error instanceof Error ? error.message : 'Failed to download video' 
      },
      { status: 500 }
    );
  }
}
