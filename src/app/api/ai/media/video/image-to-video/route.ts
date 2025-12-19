import { NextRequest, NextResponse } from 'next/server';
import { generateImageToVideo } from '@/agents/video_agent/services/imageToVideo.service';
import * as z from 'zod';

const imageToVideoSchema = z.object({
  imageUrl: z.string().min(1, 'Image URL is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.enum(['sora-2', 'sora-2-pro']).optional().default('sora-2'),
  size: z.enum(['1280x720', '1920x1080', '720x1280', '1080x1920']).optional().default('1280x720'),
  seconds: z.number().min(5).max(20).optional().default(8),
});

/**
 * POST /api/ai/media/video/image-to-video
 * Generate a video from an input reference image using Sora
 * 
 * Request body:
 * {
 *   imageUrl: string (URL or base64 data URL)
 *   prompt: string
 *   model?: 'sora-2' | 'sora-2-pro'
 *   size?: '1280x720' | '1920x1080' | '720x1280' | '1080x1920'
 *   seconds?: number (5-20)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   videoId: string
 *   status: 'queued' | 'processing' | 'completed' | 'failed'
 *   progress?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = imageToVideoSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { imageUrl, prompt, model, size, seconds } = validation.data;


    // Call the image-to-video service
    const result = await generateImageToVideo({
      imageUrl,
      prompt,
      model,
      size,
      seconds,
    });

    return NextResponse.json(result);
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate video from image',
      },
      { status: 500 }
    );
  }
}
