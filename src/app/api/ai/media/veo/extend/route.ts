/**
 * API Route: Veo Video Extension
 * POST /api/ai/media/veo/extend
 * Extend previously generated Veo videos by 7 seconds (max 20 extensions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extendVeoVideo, VEO_MAX_EXTENSIONS, VEO_EXTENSION_SECONDS } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const veoExtendSchema = z.object({
  veoVideoId: z.string().min(1, 'Veo video ID is required'),
  prompt: z.string().min(1, 'Extension prompt is required').max(4096, 'Prompt too long'),
  model: z.enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']).optional().default('veo-3.1-generate-preview'),
  extensionCount: z.number().min(0).max(VEO_MAX_EXTENSIONS - 1),
});

/**
 * POST /api/ai/media/veo/extend
 * Extend a previously generated Veo video
 * 
 * Request body:
 * {
 *   veoVideoId: string (Google's video file reference from previous generation)
 *   prompt: string (extension description - what happens next)
 *   model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
 *   extensionCount: number (current extension count, must be < 20)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   operationId: string
 *   operationName: string
 *   status: 'pending'
 *   newExtensionCount: number
 * }
 * 
 * Notes:
 * - Each extension adds 7 seconds
 * - Maximum 20 extensions per original video
 * - Resolution is fixed to 720p for extensions
 * - Only Veo-generated videos can be extended
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = veoExtendSchema.safeParse(body);

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

    const { veoVideoId, prompt, model, extensionCount } = validation.data;

    // Validate extension count
    if (extensionCount >= VEO_MAX_EXTENSIONS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${VEO_MAX_EXTENSIONS} extensions reached. Cannot extend this video further.`,
        },
        { status: 400 }
      );
    }


    // Call the Veo extension service
    const result = await extendVeoVideo({
      veoVideoId,
      prompt,
      model,
      extensionCount,
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
        error: error instanceof Error ? error.message : 'Failed to extend video',
      },
      { status: 500 }
    );
  }
}

