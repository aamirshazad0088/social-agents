/**
 * Video Download Service
 * Sub-agent for downloading completed videos
 */

import { getOpenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import { VideoDownloadRequest, VideoDownloadResponse } from '../types/video.types';

/**
 * Download completed video from OpenAI Sora
 */
export async function downloadVideo(
  request: VideoDownloadRequest
): Promise<VideoDownloadResponse> {
  const startTime = Date.now();
  const { videoId } = request;
  const openai = getOpenAIClient();

  const content = await openai.videos.downloadContent(videoId);
  const arrayBuffer = await content.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    success: true,
    videoBuffer: buffer,
    size: buffer.length,
    format: 'mp4',
    generatedAt: Date.now(),
    generationTime: Date.now() - startTime,
  };
}
