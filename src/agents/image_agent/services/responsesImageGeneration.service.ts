/**
 * Responses API Image Generation Service
 * Generate images using the OpenAI Responses API with image_generation tool
 * Per OpenAI docs: Supports multi-turn editing and conversational flows
 */

import OpenAI from 'openai';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageGenerationError,
  ImageGenerationErrorType,
} from '../types/imageGeneration.types';

// Lazy client initialization
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ImageGenerationError(
        ImageGenerationErrorType.API_KEY_INVALID,
        'OPENAI_API_KEY environment variable is not set'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Convert base64 to data URL
 */
function base64ToDataUrl(base64: string, format: string = 'png'): string {
  return `data:image/${format};base64,${base64}`;
}

/**
 * Image Generation Tool Configuration
 */
interface ImageGenerationToolConfig {
  type: 'image_generation';
  background?: 'transparent' | 'opaque' | 'auto';
  quality?: 'low' | 'medium' | 'high';
  size?: '1024x1024' | '1536x1024' | '1024x1536';
  output_format?: 'png' | 'jpeg' | 'webp';
  output_compression?: number;
  partial_images?: number;
}

/**
 * Responses API Image Generation Service
 * Uses gpt-4o with image_generation tool for conversational image creation
 */
export const responsesImageGenerationService = {
  /**
   * Generate an image using Responses API
   * Per OpenAI docs: Uses gpt-4o/gpt-5 with image_generation tool
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();

      // Build tool configuration
      const toolConfig: ImageGenerationToolConfig = {
        type: 'image_generation',
      };

      // Add optional parameters per OpenAI docs
      if (options.background && options.background !== 'auto') {
        toolConfig.background = options.background;
      }
      if (options.quality && options.quality !== 'auto') {
        toolConfig.quality = options.quality as 'low' | 'medium' | 'high';
      }
      if (options.size && options.size !== 'auto') {
        toolConfig.size = options.size as '1024x1024' | '1536x1024' | '1024x1536';
      }
      if (options.format) {
        toolConfig.output_format = options.format;
      }
      if (options.output_compression !== undefined) {
        toolConfig.output_compression = options.output_compression;
      }


      // Call Responses API with image_generation tool
      const response = await (openai as any).responses.create({
        model: 'gpt-4o', // Per docs: use gpt-4o or gpt-5
        input: prompt,
        tools: [toolConfig],
      });

      // Extract image data from response
      const imageOutput = response.output?.find(
        (output: any) => output.type === 'image_generation_call'
      );

      if (!imageOutput || !imageOutput.result) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No image data returned from Responses API'
        );
      }

      const base64Image = imageOutput.result;
      const generationTime = Date.now() - startTime;
      const format = options.format || 'png';
      const imageUrl = base64ToDataUrl(base64Image, format);


      return {
        imageUrl,
        metadata: {
          size: options.size || '1024x1024',
          quality: options.quality || 'medium',
          format,
          background: options.background || 'auto',
          model: 'gpt-4o (Responses API)',
          promptUsed: prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {

      if (error instanceof ImageGenerationError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ImageGenerationError(
            ImageGenerationErrorType.API_KEY_INVALID,
            'Invalid API key',
            error
          );
        }
        if (error.message.includes('rate limit')) {
          throw new ImageGenerationError(
            ImageGenerationErrorType.RATE_LIMIT,
            'Rate limit exceeded',
            error
          );
        }
      }

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      );
    }
  },

  /**
   * Generate image with transparent background using Responses API
   * Per docs: Set background to 'transparent' in tool config
   */
  async generateTransparentImage(
    prompt: string,
    options: Omit<ImageGenerationOptions, 'background'> = {}
  ): Promise<ImageGenerationResult> {
    return this.generateImage(prompt, {
      ...options,
      background: 'transparent',
      format: options.format || 'png', // PNG required for transparency
      quality: options.quality || 'high', // High quality recommended for transparency
    });
  },

  /**
   * Multi-turn image editing using Responses API
   * Per docs: Supports conversational editing with context
   */
  async editImageConversational(
    originalPrompt: string,
    editInstructions: string,
    previousImageBase64?: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();

      // Build the input with context
      let input = editInstructions;
      if (originalPrompt) {
        input = `Original image: ${originalPrompt}\n\nEdit instruction: ${editInstructions}`;
      }

      const toolConfig: ImageGenerationToolConfig = {
        type: 'image_generation',
      };

      if (options.background && options.background !== 'auto') {
        toolConfig.background = options.background;
      }
      if (options.quality && options.quality !== 'auto') {
        toolConfig.quality = options.quality as 'low' | 'medium' | 'high';
      }
      if (options.size && options.size !== 'auto') {
        toolConfig.size = options.size as '1024x1024' | '1536x1024' | '1024x1536';
      }


      const response = await (openai as any).responses.create({
        model: 'gpt-4o',
        input,
        tools: [toolConfig],
      });

      const imageOutput = response.output?.find(
        (output: any) => output.type === 'image_generation_call'
      );

      if (!imageOutput || !imageOutput.result) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No edited image returned'
        );
      }

      const generationTime = Date.now() - startTime;
      const format = options.format || 'png';
      const imageUrl = base64ToDataUrl(imageOutput.result, format);


      return {
        imageUrl,
        metadata: {
          size: options.size || '1024x1024',
          quality: options.quality || 'medium',
          format,
          background: options.background || 'auto',
          model: 'gpt-4o (Responses API)',
          promptUsed: input,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Edit failed',
        error
      );
    }
  },

  /**
   * Generate multiple images in batch using Responses API
   */
  async generateBatch(
    prompts: string[],
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult[]> {

    const results = await Promise.allSettled(
      prompts.map((prompt) => this.generateImage(prompt, options))
    );

    const successfulResults = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<ImageGenerationResult>).value);

    const failedCount = results.length - successfulResults.length;

    if (failedCount > 0) {
    }

    return successfulResults;
  },
};

export default responsesImageGenerationService;
