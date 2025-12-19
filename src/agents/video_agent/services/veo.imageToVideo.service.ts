/**
 * Veo Image-to-Video Generation Service
 * Generates videos using an image as the first frame
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoImageToVideoRequest,
  VeoImageToVideoResponse,
  validateResolutionDuration,
  VEO_SUPPORTED_IMAGE_FORMATS,
  VEO_MAX_IMAGE_SIZE_MB,
} from '../types/veo.types';

/**
 * Convert image URL or data URL to uploadable format
 */
export async function prepareImageForUpload(imageUrl: string): Promise<{ data: Buffer; mimeType: string }> {
  let buffer: Buffer;
  let mimeType = 'image/jpeg';

  // Handle base64 data URL
  if (imageUrl.startsWith('data:')) {
    const mimeMatch = imageUrl.match(/^data:([^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];

    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Invalid base64 data URL'
      );
    }
    buffer = Buffer.from(base64Data, 'base64');
  } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Handle HTTP/HTTPS URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new AgentError(
        AgentErrorType.NETWORK_ERROR,
        `Failed to fetch image: ${response.status}`
      );
    }
    const contentType = response.headers.get('content-type');
    if (contentType) mimeType = contentType;

    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'Unsupported image URL format. Use base64 data URL or HTTP(S) URL.'
    );
  }

  // Validate mime type
  if (!VEO_SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      `Unsupported image format: ${mimeType}. Supported: ${VEO_SUPPORTED_IMAGE_FORMATS.join(', ')}`
    );
  }

  // Validate file size
  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > VEO_MAX_IMAGE_SIZE_MB) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      `Image size ${sizeMB.toFixed(2)}MB exceeds maximum of ${VEO_MAX_IMAGE_SIZE_MB}MB`
    );
  }

  return { data: buffer, mimeType };
}

/**
 * Generate a video from an image using Google Veo 3.1
 * The image acts as the first frame of the video
 */
export async function generateVeoImageToVideo(
  request: VeoImageToVideoRequest
): Promise<VeoImageToVideoResponse> {
  const startTime = Date.now();
  const {
    imageUrl,
    prompt,
    model = 'veo-3.1-generate-preview',
    aspectRatio = '16:9',
    duration = 8,
    resolution = '720p',
  } = request;

  // Validation: 1080p only available for 8s duration
  if (!validateResolutionDuration(resolution, duration)) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      '1080p resolution is only available for 8 second videos'
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Prepare and upload the image
    const { data: imageData, mimeType } = await prepareImageForUpload(imageUrl);
    

    // Upload image to Google AI
    const uploadedImage = await ai.files.upload({
      file: new Blob([imageData], { type: mimeType }),
      config: { mimeType },
    });


    // Start video generation with image as first frame
    const operation = await ai.models.generateVideos({
      model,
      prompt,
      image: uploadedImage,
      config: {
        aspectRatio,
        numberOfVideos: 1,
      },
    });


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
      error instanceof Error ? error.message : 'Failed to generate video from image with Veo'
    );
  }
}

export default {
  generateVeoImageToVideo,
  prepareImageForUpload,
};

