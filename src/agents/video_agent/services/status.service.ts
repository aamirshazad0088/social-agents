/**
 * Video Status Service
 * Sub-agent for checking video generation status
 */

import { getOpenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import { VideoStatusRequest, VideoStatusResponse } from '../types/video.types';

/**
 * Check video generation status with OpenAI Sora
 */
export async function checkVideoStatus(
  request: VideoStatusRequest
): Promise<VideoStatusResponse> {
  const startTime = Date.now();
  const { videoId } = request;
  const openai = getOpenAIClient();

  const video = await openai.videos.retrieve(videoId);

  return {
    success: true,
    videoId: video.id,
    status: video.status as any,
    progress: (video as any).progress,
    videoUrl: (video as any).url,
    generatedAt: Date.now(),
    generationTime: Date.now() - startTime,
  };
}
