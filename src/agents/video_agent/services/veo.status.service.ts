/**
 * Veo Operation Status Service
 * Polls video generation operations until complete
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoOperationStatusRequest,
  VeoOperationStatusResponse,
  VEO_POLL_INTERVAL_MS,
} from '../types/veo.types';

/**
 * Check the status of a video generation operation
 * Returns done=true when the video is ready
 */
export async function checkVeoOperationStatus(
  request: VeoOperationStatusRequest
): Promise<VeoOperationStatusResponse> {
  const startTime = Date.now();
  const { operationId, operationName } = request;

  if (!operationId && !operationName) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'Either operationId or operationName is required'
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Get the operation status
    // The operation object needs to have the name property set
    const operationRef = {
      name: operationName || operationId,
    };

    const operation = await ai.operations.getVideosOperation({
      operation: operationRef as any,
    });

    const isDone = operation.done === true;
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
    let videoData: VeoOperationStatusResponse['video'] | undefined;
    let errorMessage: string | undefined;

    if (isDone) {
      // Check if there was an error
      if ((operation as any).error) {
        status = 'failed';
        errorMessage = (operation as any).error.message || 'Video generation failed';
      } else if (operation.response?.generatedVideos && operation.response.generatedVideos.length > 0) {
        status = 'completed';
        const generatedVideo = operation.response.generatedVideos[0];
        
        // Extract video information
        const video = generatedVideo.video;
        videoData = {
          url: video?.uri || '',
          veoVideoId: (video as any)?.name || video?.uri || '',
          duration: 8, // Default, actual duration may vary
          resolution: '720p', // Default
        };

      }
    } else {
      // Still processing
      status = 'processing';
    }

    // Estimate progress (rough estimate based on typical generation time)
    // Veo takes 11s-6min, so we can't accurately estimate
    const progress = isDone ? 100 : undefined;

    return {
      success: true,
      operationId: operationId || operationName || '',
      done: isDone,
      status,
      progress,
      video: videoData,
      error: errorMessage,
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {

    if (error instanceof AgentError) {
      throw error;
    }

    throw new AgentError(
      AgentErrorType.NETWORK_ERROR,
      error instanceof Error ? error.message : 'Failed to check operation status'
    );
  }
}

/**
 * Poll operation status until complete or timeout
 * Use this for synchronous waiting (not recommended for frontend)
 */
export async function pollVeoOperationUntilDone(
  operationId: string,
  operationName: string,
  maxWaitMs: number = 360000 // 6 minutes default
): Promise<VeoOperationStatusResponse> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkVeoOperationStatus({
      operationId,
      operationName,
    });

    if (status.done) {
      return status;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, VEO_POLL_INTERVAL_MS));
  }

  throw new AgentError(
    AgentErrorType.TIMEOUT,
    `Video generation timed out after ${maxWaitMs / 1000} seconds`
  );
}

export default {
  checkVeoOperationStatus,
  pollVeoOperationUntilDone,
};

