/**
 * API Route: Image from Reference
 * Generate new images using reference images for style consistency
 * Per OpenAI docs: Uses input_fidelity parameter for better reference preservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationService } from '@/agents/image_agent';
import { z } from 'zod';

/**
 * Schema for reference-based generation
 */
const referenceImageSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
  referenceImages: z.array(z.string()).min(1, 'At least one reference image is required'),
  input_fidelity: z.enum(['low', 'high']).optional().default('high'),
  options: z.object({
    size: z.enum(['1024x1024', '1536x1024', '1024x1536']).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    format: z.enum(['png', 'jpeg', 'webp']).optional(),
    background: z.enum(['transparent', 'opaque', 'auto']).optional(),
  }).optional(),
});

/**
 * POST /api/ai/media/image/reference
 * Generate a new image using reference images for style/content guidance
 * 
 * Request body:
 * {
 *   prompt: string
 *   referenceImages: string[] - Array of image URLs or base64 data URLs
 *   input_fidelity?: 'low' | 'high' - How closely to follow reference
 *   options?: { size?, quality?, format?, background? }
 * }
 * 
 * Input Fidelity:
 * - 'high': Preserves more details from reference images
 * - 'low': Allows more creative freedom while maintaining style
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = referenceImageSchema.safeParse(body);

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

    const { prompt, referenceImages, input_fidelity, options } = validation.data;


    // Call the reference-based generation service
    const result = await imageGenerationService.generateFromReferences({
      prompt,
      referenceImages,
      input_fidelity,
      options: options || {},
    });


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

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Reference generation failed',
      },
      { status: 500 }
    );
  }
}
