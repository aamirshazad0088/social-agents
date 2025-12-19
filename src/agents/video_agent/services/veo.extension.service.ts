/**
 * Veo Video Extension Service
 * Extends previously generated Veo videos by 7 seconds
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoExtendVideoRequest,
  VeoExtendVideoResponse,
  validateExtensionCount,
  VEO_MAX_EXTENSIONS,
  VEO_EXTENSION_SECONDS,
} from '../types/veo.types';

/**
 * Extend a previously generated Veo video
 * Each extension adds 7 seconds, maximum 20 extensions per video
 * Resolution is fixed to 720p for extensions
 */
export async function extendVeoVideo(
  request: VeoExtendVideoRequest
): Promise<VeoExtendVideoResponse> {
  const startTime = Date.now();
  const {
    veoVideoId,
    prompt,
    model = 'veo-3.1-generate-preview',
    extensionCount,
  } = request;

  // Validation: Check extension count limit
  if (!validateExtensionCount(extensionCount)) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      `Maximum ${VEO_MAX_EXTENSIONS} extensions reached. Cannot extend this video further.`
    );
  }

  if (!veoVideoId) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'veoVideoId is required to extend a video. Only Veo-generated videos can be extended.'
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Get the reference to the previous video
    // The veoVideoId should be the file name/reference from the previous generation
    const referenceVideo = await ai.files.get({ name: veoVideoId });

    if (!referenceVideo) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Could not find the source video. Make sure you are using a Veo-generated video.'
      );
    }

    // Start video extension
    // Note: Resolution is fixed to 720p for extensions per Google docs
    // Using image parameter as reference for the previous video
    const operation = await ai.models.generateVideos({
      model,
      prompt,
      image: referenceVideo as any, // Reference video for extension
      config: {
        // Resolution fixed to 720p for extensions
        numberOfVideos: 1,
      },
    });


    const operationName = (operation as any).name || '';
    const operationId = operationName.split('/').pop() || operationName;
    const newExtensionCount = extensionCount + 1;

    return {
      success: true,
      operationId,
      operationName,
      status: 'pending',
      newExtensionCount,
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {

    if (error instanceof AgentError) {
      throw error;
    }

    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to extend video with Veo'
    );
  }
}

/**
 * Calculate total duration after extension
 */
export function calculateTotalDuration(
  originalDuration: number,
  extensionCount: number
): number {
  return originalDuration + (extensionCount * VEO_EXTENSION_SECONDS);
}

/**
 * Check if a video can be extended further
 */
export function canExtendVideo(extensionCount: number): boolean {
  return extensionCount < VEO_MAX_EXTENSIONS;
}

export default {
  extendVeoVideo,
  calculateTotalDuration,
  canExtendVideo,
};

