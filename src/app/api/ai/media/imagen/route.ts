/**
 * API Route: Gemini 3 Pro Image Generation
 * POST /api/ai/media/imagen
 * 
 * Supports:
 * - edit: Gemini 3 Pro single image editing
 * - gemini-3-pro: Gemini 3 Pro generation with Google Search & reference images
 * - multi-turn: Conversational image editing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  editImageWithGemini,
  generateGemini3ProImage,
  multiTurnEditWithGemini,
  ImagenEditRequest,
  Gemini3ProImageRequest,
  MultiTurnEditRequest
} from '@/agents/image_agent/services/imagenGeneration.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'edit': {
        // Extract base64 from data URL if provided
        let imageBase64 = params.imageBase64;
        let mimeType = params.mimeType || 'image/png';

        if (params.imageUrl?.startsWith('data:')) {
          const match = params.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            imageBase64 = match[2];
          }
        }

        const editParams: ImagenEditRequest = {
          imageBase64,
          mimeType,
          prompt: params.prompt,
          model: params.model || 'gemini-3-pro-image-preview',
          aspectRatio: params.aspectRatio,
          imageSize: params.imageSize,
          responseModalities: params.responseModalities || ['TEXT', 'IMAGE'],
          enableGoogleSearch: params.enableGoogleSearch || false,
          referenceImages: params.referenceImages || [], // Up to 14 reference images
        };

        const result = await editImageWithGemini(editParams);

        // Convert base64 to data URLs
        const imageUrls = result.images.map((img) =>
          `data:${img.mimeType};base64,${img.base64}`
        );

        return NextResponse.json({
          success: true,
          images: imageUrls,
          text: result.text,
          count: imageUrls.length,
        });
      }

      case 'gemini-3-pro': {
        const gemini3ProParams: Gemini3ProImageRequest = {
          prompt: params.prompt,
          model: 'gemini-3-pro-image-preview',
          aspectRatio: params.aspectRatio || '1:1',
          imageSize: params.imageSize || '1K',
          responseModalities: params.responseModalities || ['TEXT', 'IMAGE'],
          referenceImages: params.referenceImages || [],
          enableGoogleSearch: params.enableGoogleSearch || false,
        };

        const result = await generateGemini3ProImage(gemini3ProParams);

        // Convert base64 to data URLs
        const imageUrls = result.images.map((img) =>
          `data:${img.mimeType};base64,${img.base64}`
        );

        return NextResponse.json({
          success: true,
          images: imageUrls,
          text: result.text,
          count: imageUrls.length,
        });
      }

      case 'multi-turn': {
        // Multi-turn conversational image editing
        const multiTurnParams: MultiTurnEditRequest = {
          prompt: params.prompt,
          conversationHistory: params.conversationHistory || [],
          model: 'gemini-3-pro-image-preview',
          aspectRatio: params.aspectRatio || '1:1',
          imageSize: params.imageSize || '1K',
          responseModalities: params.responseModalities || ['TEXT', 'IMAGE'],
          enableGoogleSearch: params.enableGoogleSearch || false,
        };

        const result = await multiTurnEditWithGemini(multiTurnParams);

        // Convert base64 to data URLs
        const imageUrls = result.images.map((img) =>
          `data:${img.mimeType};base64,${img.base64}`
        );

        return NextResponse.json({
          success: true,
          images: imageUrls,
          text: result.text,
          conversationHistory: result.conversationHistory,
          count: imageUrls.length,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "edit", "gemini-3-pro", or "multi-turn"' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process request',
        success: false,
      },
      { status: 500 }
    );
  }
}
