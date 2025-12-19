/**
 * Veo Frame-Specific Generation Service
 * Generates videos with specified first and last frames
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoFrameSpecificRequest,
  VeoFrameSpecificResponse,
  validateResolutionDuration,
} from '../types/veo.types';
import { prepareImageForUpload } from './veo.imageToVideo.service';

/**
 * Generate a video with specified first and last frames
 * Creates a smooth transition between the two frames
 */
export async function generateVeoFrameSpecific(
  request: VeoFrameSpecificRequest
): Promise<VeoFrameSpecificResponse> {
  const startTime = Date.now();
  const {
    firstFrameUrl,
    lastFrameUrl,
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

  if (!firstFrameUrl || !lastFrameUrl) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'Both first frame and last frame images are required'
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Prepare and upload both frames
    const [firstFrameData, lastFrameData] = await Promise.all([
      prepareImageForUpload(firstFrameUrl),
      prepareImageForUpload(lastFrameUrl),
    ]);


    // Upload both frames to Google AI
    const [uploadedFirstFrame, uploadedLastFrame] = await Promise.all([
      ai.files.upload({
        file: new Blob([firstFrameData.data], { type: firstFrameData.mimeType }),
        config: { mimeType: firstFrameData.mimeType },
      }),
      ai.files.upload({
        file: new Blob([lastFrameData.data], { type: lastFrameData.mimeType }),
        config: { mimeType: lastFrameData.mimeType },
      }),
    ]);


    // Start video generation with both frames
    // Note: lastFrameImage is a Veo 3.1 feature, using type assertion
    const operation = await ai.models.generateVideos({
      model,
      prompt,
      image: uploadedFirstFrame,        // First frame
      config: {
        aspectRatio,
        numberOfVideos: 1,
      },
      // @ts-ignore - lastFrameImage is a Veo 3.1 feature
      lastFrameImage: uploadedLastFrame, // Last frame (Veo 3.1 feature)
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
      error instanceof Error ? error.message : 'Failed to generate frame-specific video with Veo'
    );
  }
}

export default {
  generateVeoFrameSpecific,
};

