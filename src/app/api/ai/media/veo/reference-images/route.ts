/**
 * API Route: Veo Reference Images Generation
 * POST /api/ai/media/veo/reference-images
 * Generate videos guided by 1-3 reference images
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateVeoWithReferenceImages } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const veoReferenceImagesSchema = z.object({
  referenceImageUrls: z.array(z.string().min(1)).min(1, 'At least 1 reference image is required').max(3, 'Maximum 3 reference images allowed'),
  prompt: z.string().min(1, 'Prompt is required').max(4096, 'Prompt too long'),
  model: z.enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']).optional().default('veo-3.1-generate-preview'),
  aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
  resolution: z.enum(['720p', '1080p']).optional().default('720p'),
  // Duration is fixed to 8s for reference images
});

/**
 * POST /api/ai/media/veo/reference-images
 * Generate video guided by 1-3 reference images
 * 
 * Request body:
 * {
 *   referenceImageUrls: string[] (1-3 images, URLs or base64 data URLs)
 *   prompt: string (video description referencing the images)
 *   model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
 *   aspectRatio?: '16:9' | '9:16'
 *   resolution?: '720p' | '1080p'
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   operationId: string
 *   operationName: string
 *   status: 'pending'
 * }
 * 
 * Notes:
 * - Duration is fixed to 8 seconds for reference image generation
 * - Use 1-3 images to guide style, characters, or scene elements
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = veoReferenceImagesSchema.safeParse(body);

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

    const { referenceImageUrls, prompt, model, aspectRatio, resolution } = validation.data;


    // Call the Veo reference images service
    const result = await generateVeoWithReferenceImages({
      referenceImageUrls,
      prompt,
      model,
      aspectRatio,
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
        error: error instanceof Error ? error.message : 'Failed to generate video with reference images',
      },
      { status: 500 }
    );
  }
}

