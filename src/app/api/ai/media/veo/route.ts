/**
 * API Route: Veo Text-to-Video Generation
 * POST /api/ai/media/veo
 * Generate videos from text prompts using Google Veo 3.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVeoVideo } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const veoTextToVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4096, 'Prompt too long'),
  model: z.enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']).optional().default('veo-3.1-generate-preview'),
  aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
  duration: z.union([z.literal(4), z.literal(6), z.literal(8)]).optional().default(8),
  resolution: z.enum(['720p', '1080p']).optional().default('720p'),
  personGeneration: z.enum(['allow_adult', 'dont_allow']).optional(),
});

/**
 * POST /api/ai/media/veo
 * Start text-to-video generation with Google Veo 3.1
 * 
 * Request body:
 * {
 *   prompt: string (required)
 *   model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
 *   aspectRatio?: '16:9' | '9:16'
 *   duration?: 4 | 6 | 8
 *   resolution?: '720p' | '1080p' (1080p only for 8s)
 *   personGeneration?: 'allow_adult' | 'dont_allow' (for EU/UK regions)
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
    const validation = veoTextToVideoSchema.safeParse(body);

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

    const { prompt, model, aspectRatio, duration, resolution, personGeneration } = validation.data;

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


    // Call the Veo generation service
    const result = await generateVeoVideo({
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
      personGeneration,
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
        error: error instanceof Error ? error.message : 'Failed to generate video',
      },
      { status: 500 }
    );
  }
}

