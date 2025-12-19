/**
 * API Route: Image Variations
 * Create variations of an existing image using DALL-E 2
 * Per OpenAI docs: Only available with DALL-E 2
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const variationRequestSchema = z.object({
  imageUrl: z.string().min(1, 'Image URL is required'),
  n: z.number().min(1).max(10).optional().default(1),
  size: z.enum(['256x256', '512x512', '1024x1024']).optional().default('1024x1024'),
});

/**
 * Convert image URL to File object for API
 */
async function imageUrlToFile(url: string): Promise<File> {
  let buffer: Buffer;
  let mimeType = 'image/png';
  
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];
    
    const base64Data = url.split(',')[1];
    if (!base64Data) throw new Error('Invalid base64 data URL');
    buffer = Buffer.from(base64Data, 'base64');
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const contentType = response.headers.get('content-type');
    if (contentType) mimeType = contentType;
    
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('Unsupported image URL format');
  }
  
  // Convert Buffer to ArrayBuffer for File compatibility
  const fileArrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  
  const blob = new Blob([fileArrayBuffer], { type: mimeType });
  return new File([blob], 'image.png', { type: mimeType });
}

/**
 * POST /api/ai/media/image/variation
 * Create variations of an existing image
 * 
 * Request body:
 * {
 *   imageUrl: string - The image to create variations of (URL or base64)
 *   n?: number - Number of variations (1-10, default 1)
 *   size?: '256x256' | '512x512' | '1024x1024' - Output size
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = variationRequestSchema.safeParse(body);

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

    const { imageUrl, n, size } = validation.data;


    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageFile = await imageUrlToFile(imageUrl);

    const response = await openai.images.createVariation({
      model: 'dall-e-2',
      image: imageFile,
      n,
      size,
      response_format: 'b64_json',
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No variations returned from API');
    }

    const variations = response.data.map((item, index) => ({
      id: `var_${Date.now()}_${index}`,
      imageUrl: `data:image/png;base64,${item.b64_json}`,
      index,
    }));


    return NextResponse.json({
      success: true,
      data: {
        variations,
        count: variations.length,
      },
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create variations',
      },
      { status: 500 }
    );
  }
}
