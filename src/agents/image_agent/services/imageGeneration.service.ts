/**
 * Image Generation Service - Core Logic
 * Professional service for OpenAI GPT Image 1 generation
 * Separated concerns: This file contains ONLY business logic
 */

import OpenAI from 'openai';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageGenerationError,
  ImageGenerationErrorType,
  StreamingProgressEvent,
  ImageEditRequest,
  ImageToImageRequest,
} from '../types/imageGeneration.types';
import {
  improveImagePromptTemplate,
  qualityEnhancements,
} from '../prompts/imageGeneration.prompts';

// Lazy client initialization
let openaiClient: OpenAI | null = null;

/**
 * Get or initialize OpenAI client
 */
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
 * Apply default options and validate
 */
function applyDefaults(options: ImageGenerationOptions = {}): Required<ImageGenerationOptions> {
  return {
    size: options.size || '1024x1024',
    quality: options.quality || 'medium',
    format: options.format || 'png',
    background: options.background || 'auto',
    output_compression: options.output_compression || 80,
    moderation: options.moderation || 'auto',
  };
}

/**
 * Build request parameters for OpenAI API
 * According to official OpenAI docs - supports gpt-image-1.5, dall-e-3, dall-e-2
 */
function buildRequestParams(
  prompt: string,
  options: Required<ImageGenerationOptions> & { model?: string; style?: string; n?: number },
  streamingOptions?: { stream: boolean; partial_images?: number }
): any {
  const model = options.model || 'gpt-image-1.5';

  // Base params for all models
  const params: any = {
    model,
    prompt,
  };

  // Size handling (varies by model)
  if (options.size && options.size !== 'auto') {
    params.size = options.size;
  } else {
    params.size = '1024x1024'; // Default for all models
  }

  // Model-specific parameters
  if (model === 'gpt-image-1.5') {
    // gpt-image-1.5 specific options
    if (options.quality && options.quality !== 'auto') {
      params.quality = options.quality;
    }
    if (options.background && options.background !== 'auto') {
      params.background = options.background;
    }
    if (options.moderation) {
      params.moderation = options.moderation;
    }
    // gpt-image-1.5 always returns b64_json

    // Streaming support (gpt-image-1.5 only)
    if (streamingOptions?.stream) {
      params.stream = true;
      params.partial_images = streamingOptions.partial_images ?? 2;
    }
  } else if (model === 'dall-e-3') {
    // dall-e-3 specific options
    if (options.quality) {
      params.quality = options.quality === 'high' ? 'hd' : 'standard';
    }
    if (options.style) {
      params.style = options.style; // 'vivid' or 'natural'
    }
    params.response_format = 'b64_json';
    // dall-e-3 only supports n=1
  } else if (model === 'dall-e-2') {
    // dall-e-2 specific options
    if (options.n && options.n > 1) {
      params.n = Math.min(options.n, 10);
    }
    params.response_format = 'b64_json';
  }

  // Remove undefined values
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
}

/**
 * Convert base64 to data URL with appropriate MIME type
 */
function base64ToDataUrl(base64: string, format: string): string {
  return `data:image/${format};base64,${base64}`;
}

/**
 * Image Generation Service
 * Supports gpt-image-1.5, dall-e-3, dall-e-2 per OpenAI Images API docs
 */
export const imageGenerationService = {
  /**
   * Generate a single image
   * Supports: gpt-image-1.5 (default), dall-e-3, dall-e-2
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions & { model?: string; style?: string; n?: number } = {}
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    const model = options.model || 'gpt-image-1.5';

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(options);
      const params = buildRequestParams(prompt, { ...finalOptions, model, style: options.style, n: options.n });


      const response = await openai.images.generate(params);

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No image data received from API'
        );
      }

      const imageData = response.data[0];

      // All models return b64_json when response_format is set
      const base64Image = imageData.b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in response'
        );
      }

      const generationTime = Date.now() - startTime;
      // All models return PNG format
      const imageUrl = base64ToDataUrl(base64Image, 'png');


      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model,
          promptUsed: prompt,
          revisedPrompt: (imageData as any).revised_prompt,
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
   * Generate image with streaming (progressive generation)
   * Per OpenAI docs: supports 0-3 partial images during generation
   */
  async generateImageStreaming(
    prompt: string,
    options: ImageGenerationOptions = {},
    onProgress?: (event: StreamingProgressEvent) => void,
    partialImagesCount: number = 2 // 0-3 partial images
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(options);
      const params = buildRequestParams(prompt, finalOptions, {
        stream: true,
        partial_images: Math.min(Math.max(0, partialImagesCount), 3), // Clamp 0-3
      });


      const stream = await openai.images.generate(params) as any;

      let finalImage: string | null = null;
      let revisedPrompt: string | undefined;
      let partialCount = 0;

      // Per OpenAI docs: stream events for progressive generation
      // @ts-ignore - OpenAI SDK streaming types may not be fully defined
      for await (const event of stream) {

        // Partial images during generation (per docs example)
        if (event.type === 'image_generation.partial_image') {
          const idx = event.partial_image_index;
          const imageBase64 = event.b64_json;
          const progress = ((idx + 1) / (partialImagesCount + 1)) * 100;

          partialCount++;

          if (onProgress) {
            onProgress({
              type: 'partial',
              partial_image_index: idx,
              imageB64: imageBase64,
              b64_json: imageBase64,
              progress,
            });
          }
        }
        // Final image (after all partials complete)
        // The docs don't explicitly show this, but the final image comes as a regular response
        else if (event.b64_json) {
          finalImage = event.b64_json;
          revisedPrompt = event.revised_prompt;
        }
        // Alternative: response data array format (non-streaming compatible)
        else if (event.data?.[0]?.b64_json) {
          finalImage = event.data[0].b64_json;
          revisedPrompt = event.data[0].revised_prompt;
        }
      }

      if (!finalImage) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.STREAMING_FAILED,
          `No final image received from stream. Received ${partialCount} partial images. Stream may have ended prematurely.`
        );
      }

      const generationTime = Date.now() - startTime;
      const imageUrl = base64ToDataUrl(finalImage, finalOptions.format);

      if (onProgress) {
        onProgress({
          type: 'final',
          progress: 100,
        });
      }

      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: prompt,
          revisedPrompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {

      if (onProgress) {
        onProgress({
          type: 'error',
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }

      if (error instanceof ImageGenerationError) {
        throw error;
      }

      throw new ImageGenerationError(
        ImageGenerationErrorType.STREAMING_FAILED,
        error instanceof Error ? error.message : 'Streaming failed',
        error
      );
    }
  },

  /**
   * Edit image with mask (inpainting)
   * Per OpenAI docs: Uses images.edit() with mask parameter
   */
  async editImageWithMask(
    request: ImageEditRequest
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(request.options);


      // Helper function to convert URL to File object
      const urlToFile = async (url: string, name: string): Promise<File> => {
        let buffer: Buffer;
        let mimeType = 'image/png';

        // Data URL (base64)
        if (url.startsWith('data:')) {
          const mimeMatch = url.match(/^data:([^;]+);/);
          if (mimeMatch) mimeType = mimeMatch[1];

          const base64Data = url.split(',')[1];
          if (!base64Data) {
            throw new Error(`Failed to extract base64 data from ${name}`);
          }
          buffer = Buffer.from(base64Data, 'base64');
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
          // HTTP/HTTPS URL - fetch it
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${name}: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (contentType) mimeType = contentType;

          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(`Unsupported ${name} URL format`);
        }

        // Convert Buffer to ArrayBuffer for File compatibility
        const ext = mimeType.split('/')[1] || 'png';
        const fileArrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        ) as ArrayBuffer;

        const blob = new Blob([fileArrayBuffer], { type: mimeType });
        return new File([blob], `${name}.${ext}`, { type: mimeType });
      };

      const imageFile = await urlToFile(request.originalImageUrl, 'image');
      const maskFile = await urlToFile(request.maskImageUrl, 'mask');


      // Per OpenAI docs: edit endpoint supports: model, image, mask, prompt
      // NOTE: quality and background are NOT supported in images.edit()
      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFile,
        mask: maskFile,
        prompt: request.prompt,
      });

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No edited image data received'
        );
      }

      const base64Image = response.data[0].b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in edit response'
        );
      }

      const generationTime = Date.now() - startTime;
      // API returns PNG format by default
      const imageUrl = base64ToDataUrl(base64Image, 'png');


      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: request.prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Image editing failed',
        error
      );
    }
  },

  /**
   * Generate from reference images (image-to-image)
   * Per OpenAI docs: Uses images.edit() with image file and input_fidelity
   */
  async generateFromReferences(
    request: ImageToImageRequest
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(request.options);


      // Convert reference images to File objects
      const imageFiles = await Promise.all(
        request.referenceImages.map(async (url, index) => {

          let buffer: Buffer;
          let mimeType = 'image/png';

          // Check if it's a data URL (base64)
          if (url.startsWith('data:')) {
            // Extract mime type from data URL
            const mimeMatch = url.match(/^data:([^;]+);/);
            if (mimeMatch) mimeType = mimeMatch[1];

            const base64Data = url.split(',')[1];
            if (!base64Data) {
              throw new Error('Failed to extract base64 data from data URL');
            }
            buffer = Buffer.from(base64Data, 'base64');
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            // Otherwise, it's an HTTP/HTTPS URL - fetch it
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image from URL: ${response.status}`);
            }
            // Get content type from response
            const contentType = response.headers.get('content-type');
            if (contentType) mimeType = contentType;

            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          } else {
            throw new Error(`Unsupported URL format: ${url.substring(0, 100)}`);
          }

          // Get extension from mime type
          const ext = mimeType.split('/')[1] || 'png';

          // Create ArrayBuffer from Buffer for proper Blob/File compatibility
          // Need to copy to avoid SharedArrayBuffer type issues
          const fileArrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          ) as ArrayBuffer;

          const blob = new Blob([fileArrayBuffer], { type: mimeType });
          const file = new File([blob], `reference_${index}.${ext}`, { type: mimeType });
          return file;
        })
      );

      // Per OpenAI docs: For single reference, use image directly
      // For the images.edit endpoint, use the first image as the main reference
      const primaryImage = imageFiles[0];


      // Per OpenAI docs: edit endpoint supports: model, image, prompt, input_fidelity
      // NOTE: quality and background are NOT supported in images.edit()
      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: primaryImage, // Single File object for the reference
        prompt: request.prompt,
        // @ts-ignore - input_fidelity is a valid param for gpt-image-1
        input_fidelity: request.input_fidelity || 'high',
      });

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No image data from reference generation'
        );
      }

      const base64Image = response.data[0].b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in reference generation response'
        );
      }

      const generationTime = Date.now() - startTime;
      // API returns PNG format by default
      const imageUrl = base64ToDataUrl(base64Image, 'png');


      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: request.prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Reference generation failed',
        error
      );
    }
  },

  /**
   * Batch generate multiple variations
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

export default imageGenerationService;
