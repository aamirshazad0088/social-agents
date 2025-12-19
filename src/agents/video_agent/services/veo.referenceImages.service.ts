/**
 * Veo Reference Images Generation Service
 * Generates videos guided by 1-3 reference images
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoReferenceImagesRequest,
  VeoReferenceImagesResponse,
  validateReferenceImagesCount,
} from '../types/veo.types';
import { prepareImageForUpload } from './veo.imageToVideo.service';

/**
 * Generate a video guided by 1-3 reference images
 * Duration is fixed to 8 seconds for reference image generation
 */
export async function generateVeoWithReferenceImages(
  request: VeoReferenceImagesRequest
): Promise<VeoReferenceImagesResponse> {
  const startTime = Date.now();
  const {
    referenceImageUrls,
    prompt,
    model = 'veo-3.1-generate-preview',
    aspectRatio = '16:9',
    resolution = '720p',
  } = request;

  // Validation: Check reference images count (1-3)
  if (!validateReferenceImagesCount(referenceImageUrls)) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'Reference images must be between 1 and 3 images'
    );
  }

  // Duration is fixed to 8s for reference images
  const duration = 8;

  try {
    const ai = getGoogleGenAIClient();


    // Prepare all reference images
    const preparedImages = await Promise.all(
      referenceImageUrls.map(url => prepareImageForUpload(url))
    );


    // Upload all reference images to Google AI
    const uploadedImages = await Promise.all(
      preparedImages.map(img =>
        ai.files.upload({
          file: new Blob([img.data], { type: img.mimeType }),
          config: { mimeType: img.mimeType },
        })
      )
    );


    // Start video generation with reference images
    // Note: referenceImages is a Veo 3.1 feature, using type assertion
    const operation = await ai.models.generateVideos({
      model,
      prompt,
      // Use the first image as the main image reference
      image: uploadedImages[0],
      config: {
        aspectRatio,
        // Duration is fixed to 8s for reference images
        numberOfVideos: 1,
      },
      // @ts-ignore - referenceImages is a Veo 3.1 feature for additional images
      ...(uploadedImages.length > 1 ? { referenceImages: uploadedImages.slice(1) } : {}),
    } as any);


    const operationName = (operation as any).name || '';
    const operationId = operationName.split('/').pop() || operationName;

    return {
      success: true,
      operationId,
      operationName,
      status: 'pending',
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {

    if (error instanceof AgentError) {
      throw error;
    }

    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to generate video with reference images'
    );
  }
}

export default {
  generateVeoWithReferenceImages,
};

