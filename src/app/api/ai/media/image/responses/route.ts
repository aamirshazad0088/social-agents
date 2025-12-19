/**
 * API Route: Image Generation via Responses API
 * Uses OpenAI Responses API with image_generation tool
 * Per docs: Supports gpt-4o/gpt-5 with conversational image creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { responsesImageGenerationService } from '@/agents/image_agent/services/responsesImageGeneration.service';
import { ImageGenerationError, ImageGenerationErrorType } from '@/agents/image_agent';
import { z } from 'zod';

/**
 * Request schema for Responses API image generation
 */
const responsesImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  options: z.object({
    size: z.enum(['1024x1024', '1536x1024', '1024x1536']).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    format: z.enum(['png', 'jpeg', 'webp']).optional(),
    background: z.enum(['transparent', 'opaque', 'auto']).optional(),
    output_compression: z.number().min(0).max(100).optional(),
  }).optional(),
  // For multi-turn editing
  editMode: z.boolean().optional(),
  originalPrompt: z.string().optional(),
  editInstructions: z.string().optional(),
});

/**
 * POST /api/ai/media/image/responses
 * Generate an image using OpenAI Responses API with image_generation tool
 * 
 * Request body:
 * {
 *   prompt: string
 *   options?: {
 *     size?: '1024x1024' | '1536x1024' | '1024x1536'
 *     quality?: 'low' | 'medium' | 'high'
 *     format?: 'png' | 'jpeg' | 'webp'
 *     background?: 'transparent' | 'opaque' | 'auto'
 *     output_compression?: number (0-100)
 *   }
 *   // For edit mode:
 *   editMode?: boolean
 *   originalPrompt?: string
 *   editInstructions?: string
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   data: {
 *     imageUrl: string (base64 data URL)
 *     metadata: object
 *     generatedAt: number
 *     generationTime: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = responsesImageSchema.safeParse(body);

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

    const { prompt, options, editMode, originalPrompt, editInstructions } = validation.data;


    let result;

    if (editMode && editInstructions) {
      // Multi-turn editing mode
      result = await responsesImageGenerationService.editImageConversational(
        originalPrompt || prompt,
        editInstructions,
        undefined,
        options || {}
      );
    } else if (options?.background === 'transparent') {
      // Transparent image generation
      result = await responsesImageGenerationService.generateTransparentImage(
        prompt,
        options
      );
    } else {
      // Standard generation
      result = await responsesImageGenerationService.generateImage(prompt, options || {});
    }


    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        metadata: result.metadata,
        generatedAt: result.generatedAt,
        generationTime: result.generationTime,
      },
    });
  } catch (error) {

    if (error instanceof ImageGenerationError) {
      const statusCode =
        error.type === ImageGenerationErrorType.API_KEY_INVALID
          ? 401
          : error.type === ImageGenerationErrorType.RATE_LIMIT
          ? 429
          : 500;

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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
