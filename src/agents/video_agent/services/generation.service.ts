/**
 * Video Generation Service
 * Sub-agent for generating videos with OpenAI Sora
 */

import { getOpenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import { VideoGenerationRequest, VideoGenerationResponse } from '../types/video.types';

/**
 * Generate a video using AI with OpenAI Sora
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const startTime = Date.now();
  const { prompt, model = 'sora-2', size = '1280x720', seconds = '8' } = request;
  const openai = getOpenAIClient();

  const video = await openai.videos.create({
    model,
    prompt,
    size: size as any,
    seconds: seconds as any,
  });

  return {
    success: true,
    videoId: video.id,
    status: video.status as any,
    progress: (video as any).progress,
    generatedAt: Date.now(),
    generationTime: Date.now() - startTime,
  };
}
