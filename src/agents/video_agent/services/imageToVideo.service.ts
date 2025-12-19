/**
 * Image to Video Generation Service
 * Generates videos from input reference images using OpenAI Sora
 */

import { getOpenAIClient } from '@/agents/shared/utils/client.utils';
import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';

export interface ImageToVideoRequest {
  imageUrl: string; // URL or base64 data URL of the reference image
  prompt: string;
  model?: 'sora-2' | 'sora-2-pro';
  size?: '1280x720' | '1920x1080' | '720x1280' | '1080x1920';
  seconds?: number;
}

export interface ImageToVideoResponse {
  success: boolean;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  generatedAt: number;
  generationTime?: number;
}

/**
 * Convert image URL or data URL to File object for API submission
 */
async function imageToFile(imageUrl: string): Promise<File> {
  let buffer: Buffer;
  let mimeType = 'image/jpeg';
  
  // Handle base64 data URL
  if (imageUrl.startsWith('data:')) {
    const mimeMatch = imageUrl.match(/^data:([^;]+);/);
    if (mimeMatch) mimeType = mimeMatch[1];
    
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data URL');
    }
    buffer = Buffer.from(base64Data, 'base64');
  } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Handle HTTP/HTTPS URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (contentType) mimeType = contentType;
    
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('Unsupported image URL format');
  }
  
  // Convert Buffer to ArrayBuffer for File compatibility
  const fileArrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  
  const ext = mimeType.split('/')[1] || 'jpg';
  const blob = new Blob([fileArrayBuffer], { type: mimeType });
  return new File([blob], `reference.${ext}`, { type: mimeType });
}


/**
 * Generate a video from an input reference image using Sora
 * The image acts as the first frame of the video
 */
export async function generateImageToVideo(
  request: ImageToVideoRequest
): Promise<ImageToVideoResponse> {
  const startTime = Date.now();
  const {
    imageUrl,
    prompt,
    model = 'sora-2',
    size = '1280x720',
    seconds = 8,
  } = request;

  try {
    const openai = getOpenAIClient();
    

    // Convert image to File object
    const imageFile = await imageToFile(imageUrl);
    

    // Call OpenAI Sora API with input_reference
    // Per OpenAI docs: POST /v1/videos with input_reference parameter
    const video = await (openai as any).videos.create({
      model,
      prompt,
      size,
      seconds,
      input_reference: imageFile,
    });


    return {
      success: true,
      videoId: video.id,
      status: video.status as any,
      progress: (video as any).progress,
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {
    
    if (error instanceof AgentError) {
      throw error;
    }
    
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to generate video from image'
    );
  }
}

/**
 * Generate video with multiple reference images (for style consistency)
 */
export async function generateVideoWithReferences(
  prompt: string,
  referenceImages: string[],
  options: {
    model?: 'sora-2' | 'sora-2-pro';
    size?: '1280x720' | '1920x1080';
    seconds?: number;
  } = {}
): Promise<ImageToVideoResponse> {
  const startTime = Date.now();
  const { model = 'sora-2', size = '1280x720', seconds = 8 } = options;

  try {
    const openai = getOpenAIClient();

    // Use first image as reference (per OpenAI docs)
    const imageFile = await imageToFile(referenceImages[0]);

    // Enhance prompt with reference context
    const enhancedPrompt = referenceImages.length > 1
      ? `${prompt}. Maintain visual consistency with the provided reference.`
      : prompt;

    const video = await (openai as any).videos.create({
      model,
      prompt: enhancedPrompt,
      size,
      seconds,
      input_reference: imageFile,
    });

    return {
      success: true,
      videoId: video.id,
      status: video.status as any,
      progress: (video as any).progress,
      generatedAt: Date.now(),
      generationTime: Date.now() - startTime,
    };
  } catch (error) {
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to generate video with references'
    );
  }
}

export default {
  generateImageToVideo,
  generateVideoWithReferences,
};
