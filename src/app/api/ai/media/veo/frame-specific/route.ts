/**
 * API Route: Veo Frame-Specific Generation
 * POST /api/ai/media/veo/frame-specific
 * Generate videos with specified first and last frames
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVeoFrameSpecific } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const veoFrameSpecificSchema = z.object({
  firstFrameUrl: z.string().min(1, 'First frame image URL is required'),
  lastFrameUrl: z.string().min(1, 'Last frame image URL is required'),
  prompt: z.string().min(1, 'Transition prompt is required').max(4096, 'Prompt too long'),
  model: z.enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']).optional().default('veo-3.1-generate-preview'),
  aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
  duration: z.union([z.literal(4), z.literal(6), z.literal(8)]).optional().default(8),
  resolution: z.enum(['720p', '1080p']).optional().default('720p'),
});

/**
 * POST /api/ai/media/veo/frame-specific
 * Generate video with specified first and last frames
 * 
 * Request body:
 * {
 *   firstFrameUrl: string (URL or base64 data URL)
 *   lastFrameUrl: string (URL or base64 data URL)
 *   prompt: string (transition description)
 *   model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
 *   aspectRatio?: '16:9' | '9:16'
 *   duration?: 4 | 6 | 8
 *   resolution?: '720p' | '1080p' (1080p only for 8s)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   operationId: string
 *   operationName: string
 *   status: 'pending'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = veoFrameSpecificSchema.safeParse(body);

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

    const { firstFrameUrl, lastFrameUrl, prompt, model, aspectRatio, duration, resolution } = validation.data;

    // Validate: 1080p only available for 8s duration
    if (resolution === '1080p' && duration !== 8) {
      return NextResponse.json(
        {
          success: false,
          error: '1080p resolution is only available for 8 second videos',
        },
        { status: 400 }
      );
    }


    // Call the Veo frame-specific service
    const result = await generateVeoFrameSpecific({
      firstFrameUrl,
      lastFrameUrl,
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
    });

    return NextResponse.json(result);
  } catch (error) {

    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 :
                        error.type === 'RATE_LIMIT' ? 429 :
                        error.type === 'VALIDATION_ERROR' ? 400 : 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate frame-specific video',
      },
      { status: 500 }
    );
  }
}

