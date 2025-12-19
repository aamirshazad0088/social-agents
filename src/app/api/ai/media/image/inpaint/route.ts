/**
 * API Route: Image Inpainting
 * Edit specific areas of an image using a mask
 * Per OpenAI docs: Transparent areas of mask indicate where to edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationService } from '@/agents/image_agent';
import { z } from 'zod';

/**
 * Schema for inpainting request
 */
const inpaintRequestSchema = z.object({
  originalImageUrl: z.string().min(1, 'Original image URL is required'),
  maskImageUrl: z.string().min(1, 'Mask image URL is required'),
  prompt: z.string().min(3, 'Prompt must describe the full desired image'),
  options: z.object({
    size: z.enum(['1024x1024', '1536x1024', '1024x1536']).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    format: z.enum(['png', 'jpeg', 'webp']).optional(),
  }).optional(),
});

/**
 * POST /api/ai/media/image/inpaint
 * Edit specific areas of an image using a mask (inpainting)
 * 
 * Request body:
 * {
 *   originalImageUrl: string - The image to edit
 *   maskImageUrl: string - PNG with transparent areas where editing should occur
 *   prompt: string - Description of the FULL desired result image
 *   options?: { size?, quality?, format? }
 * }
 * 
 * Note: The prompt should describe the complete new image, not just the edited area
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = inpaintRequestSchema.safeParse(body);

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

    const { originalImageUrl, maskImageUrl, prompt, options } = validation.data;


    // Call the inpainting service
    const result = await imageGenerationService.editImageWithMask({
      originalImageUrl,
      maskImageUrl,
      prompt,
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
        error: error instanceof Error ? error.message : 'Inpainting failed',
      },
      { status: 500 }
    );
  }
}
