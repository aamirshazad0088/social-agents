/**
 * Veo Video Download Service
 * Downloads generated videos and uploads to Supabase storage
 * Based on: https://ai.google.dev/gemini-api/docs/video
 */

import { getGoogleGenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';
import {
  VeoDownloadRequest,
  VeoDownloadResponse,
} from '../types/veo.types';

/**
 * Download a generated video from Google AI
 * Note: Videos are stored on Google servers for 2 days
 */
export async function downloadVeoVideo(
  request: VeoDownloadRequest
): Promise<VeoDownloadResponse> {
  const startTime = Date.now();
  const { veoVideoId, operationId } = request;

  if (!veoVideoId) {
    throw new AgentError(
      AgentErrorType.VALIDATION_ERROR,
      'veoVideoId is required to download a video'
    );
  }

  try {
    const ai = getGoogleGenAIClient();


    // Get the video file reference
    const videoFile = await ai.files.get({ name: veoVideoId });

    if (!videoFile) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Video file not found. Videos are only stored for 2 days after generation.'
      );
    }

    // Download the video content using temporary path
    const tempPath = `/tmp/veo-download-${Date.now()}.mp4`;
    await ai.files.download({
      file: videoFile,
      downloadPath: tempPath,
    });

    // Read the downloaded file into buffer
    const fs = await import('fs/promises');
    const videoBuffer = await fs.readFile(tempPath);
    
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }


    return {
      success: true,
      videoBuffer,
      size: videoBuffer.length,
      format: 'mp4',
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {

    if (error instanceof AgentError) {
      throw error;
    }

    throw new AgentError(
      AgentErrorType.NETWORK_ERROR,
      error instanceof Error ? error.message : 'Failed to download video'
    );
  }
}

/**
 * Download video and convert to base64 data URL
 * Useful for direct embedding or upload to other services
 */
export async function downloadVeoVideoAsDataUrl(
  request: VeoDownloadRequest
): Promise<{ dataUrl: string; size: number }> {
  const { videoBuffer, size } = await downloadVeoVideo(request);
  
  const base64 = videoBuffer.toString('base64');
  const dataUrl = `data:video/mp4;base64,${base64}`;

  return { dataUrl, size };
}

/**
 * Get video download URL directly from Google
 * Note: This URL is temporary and expires
 */
export async function getVeoVideoUrl(veoVideoId: string): Promise<string> {
  try {
    const ai = getGoogleGenAIClient();
    
    const videoFile = await ai.files.get({ name: veoVideoId });
    
    if (!videoFile || !videoFile.uri) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Video URL not available'
      );
    }

    return videoFile.uri;
  } catch (error) {

    if (error instanceof AgentError) {
      throw error;
    }

    throw new AgentError(
      AgentErrorType.NETWORK_ERROR,
      error instanceof Error ? error.message : 'Failed to get video URL'
    );
  }
}

export default {
  downloadVeoVideo,
  downloadVeoVideoAsDataUrl,
  getVeoVideoUrl,
};

