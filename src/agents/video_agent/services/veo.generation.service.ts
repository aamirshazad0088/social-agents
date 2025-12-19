/**
 * Veo Text-to-Video Generation Service
 * Generates videos from text prompts using Google Veo 3.1
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoTextToVideoRequest,
  VeoTextToVideoResponse,
  validateResolutionDuration,
  VEO_MAX_PROMPT_TOKENS,
} from '../types/veo.types';

/**
 * Generate a video from text prompt using Google Veo 3.1
 * Returns an operation ID for polling - video generation is asynchronous
 */
export async function generateVeoVideo(
  request: VeoTextToVideoRequest
): Promise<VeoTextToVideoResponse> {
  const startTime = Date.now();
  const {
    prompt,
    model = 'veo-3.1-generate-preview',
    aspectRatio = '16:9',
    duration = 8,
    resolution = '720p',
    personGeneration,
  } = request;

  // Validation: 1080p only available for 8s duration
  if (!validateResolutionDuration(resolution, duration)) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      '1080p resolution is only available for 8 second videos'
    );
  }

  // Validation: Check prompt length (rough estimate - 1 token ≈ 4 chars)
  const estimatedTokens = Math.ceil(prompt.length / 4);
  if (estimatedTokens > VEO_MAX_PROMPT_TOKENS) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      `Prompt exceeds maximum token limit of ${VEO_MAX_PROMPT_TOKENS}`
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Build config object
    const config: Record<string, any> = {
      aspectRatio,
      numberOfVideos: 1,
    };

    // Add person generation setting for EU/UK regions if specified
    if (personGeneration) {
      config.personGeneration = personGeneration;
    }

    // Start video generation - returns operation immediately
    const operation = await ai.models.generateVideos({
      model,
      prompt,
      config,
    });


    // Extract operation ID from the operation object
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
      error instanceof Error ? error.message : 'Failed to generate video with Veo'
    );
  }
}

export default {
  generateVeoVideo,
};

