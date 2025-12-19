/**
 * Gemini 3 Pro Image Generation Service
 * Supports text-to-image and image editing via Gemini API
 */

import { AgentError, AgentErrorType } from '@/agents/shared/types/common.types';

// Gemini 3 Pro Image Request Types
export interface Gemini3ProImageRequest {
  prompt: string;
  model?: 'gemini-3-pro-image-preview';
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  responseModalities?: ('TEXT' | 'IMAGE')[];
  referenceImages?: {
    data: string; // base64
    mimeType: string;
  }[];
  enableGoogleSearch?: boolean; // Enable grounding with Google Search
}

// Multi-turn conversation types
export interface ConversationMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inline_data?: {
      mime_type: string;
      data: string;
    };
    thought_signature?: string;
  }>;
}

export interface MultiTurnEditRequest {
  prompt: string;
  conversationHistory: ConversationMessage[];
  model?: 'gemini-3-pro-image-preview';
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  responseModalities?: ('TEXT' | 'IMAGE')[];
  enableGoogleSearch?: boolean;
}

export interface MultiTurnEditResponse extends ImagenResponse {
  conversationHistory: ConversationMessage[];
}

export interface ImagenEditRequest {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  prompt: string;
  model?: 'gemini-3-pro-image-preview';
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  imageSize?: '1K' | '2K' | '4K';
  responseModalities?: ('TEXT' | 'IMAGE')[];
  enableGoogleSearch?: boolean; // Enable grounding with Google Search
  // Up to 14 reference images: 6 objects (high-fidelity) + 5 humans (character consistency)
  referenceImages?: {
    data: string; // base64
    mimeType: string;
  }[];
}

export interface ImagenResponse {
  success: boolean;
  images: {
    base64: string;
    mimeType: string;
  }[];
  text?: string;
  error?: string;
}

/**
 * Edit/Inpaint image using Gemini 3 Pro Image Preview
 * Supports advanced editing with aspect ratio, resolution control, and up to 14 reference images
 * Reference images: up to 6 objects (high-fidelity) + up to 5 humans (character consistency)
 */
export async function editImageWithGemini(
  request: ImagenEditRequest
): Promise<ImagenResponse> {
  const {
    imageBase64,
    mimeType,
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio,
    imageSize,
    responseModalities = ['TEXT', 'IMAGE'],
    enableGoogleSearch = false,
    referenceImages = [],
  } = request;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AgentError(
      AgentErrorType.CONFIGURATION_ERROR,
      'GEMINI_API_KEY is not configured'
    );
  }

  try {

    const generationConfig: any = {
      responseModalities,
    };

    // Add image config if aspect ratio or size is specified
    if (aspectRatio || imageSize) {
      generationConfig.imageConfig = {};
      if (aspectRatio) generationConfig.imageConfig.aspectRatio = aspectRatio;
      if (imageSize) generationConfig.imageConfig.imageSize = imageSize;
    }

    // Build parts array with main image, reference images, and prompt
    const parts: any[] = [
      // Main image to edit
      {
        inline_data: {
          mime_type: mimeType,
          data: imageBase64,
        },
      },
    ];

    // Add reference images (up to 14: 6 objects + 5 humans + main image = 12 additional max)
    if (referenceImages.length > 0) {
      if (referenceImages.length > 13) {
      }
      referenceImages.slice(0, 13).forEach((img) => {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data,
          },
        });
      });
    }

    // Add prompt at the end
    parts.push({ text: prompt });

    // Build request body
    const requestBody: any = {
      contents: [{ parts }],
      generationConfig,
    };

    // Add Google Search grounding if enabled
    if (enableGoogleSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const responseParts = candidate?.content?.parts || [];

    const images: { base64: string; mimeType: string }[] = [];
    let textResponse = '';

    for (const part of responseParts) {
      if (part.text) {
        textResponse = part.text;
      } else if (part.inlineData) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        });
      }
    }


    return {
      success: true,
      images,
      text: textResponse,
    };
  } catch (error) {
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to edit image with Gemini'
    );
  }
}

/**
 * Generate images using Gemini 3 Pro Image Preview
 * Supports up to 4K resolution, Google Search grounding, and advanced features
 */
export async function generateGemini3ProImage(
  request: Gemini3ProImageRequest
): Promise<ImagenResponse> {
  const {
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '1:1',
    imageSize = '1K',
    responseModalities = ['TEXT', 'IMAGE'],
    referenceImages = [],
    enableGoogleSearch = false,
  } = request;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AgentError(
      AgentErrorType.CONFIGURATION_ERROR,
      'GEMINI_API_KEY is not configured'
    );
  }

  try {

    // Build content parts array - text first, then images
    const parts: any[] = [
      {
        text: prompt,
      },
    ];

    // Add reference images if provided (up to 14)
    if (referenceImages.length > 0) {
      if (referenceImages.length > 14) {
      }

      referenceImages.slice(0, 14).forEach((img) => {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data,
          },
        });
      });
    }

    // Build request body
    const requestBody: any = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseModalities,
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    };

    // Add Google Search tool if enabled
    if (enableGoogleSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini 3 Pro Image API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const generatedParts = candidate?.content?.parts || [];

    const images: { base64: string; mimeType: string }[] = [];
    let textResponse = '';

    for (const part of generatedParts) {
      // Skip thought parts (interim images used for reasoning)
      if (part.thought) continue;
      
      if (part.text) {
        textResponse = part.text;
      } else if (part.inlineData) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        });
      }
    }


    return {
      success: true,
      images,
      text: textResponse,
    };
  } catch (error) {
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to generate image with Gemini 3 Pro Image'
    );
  }
}

/**
 * Multi-turn image editing with Gemini 3 Pro Image Preview
 * Supports conversational refinement of images
 */
export async function multiTurnEditWithGemini(
  request: MultiTurnEditRequest
): Promise<MultiTurnEditResponse> {
  const {
    prompt,
    conversationHistory,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '1:1',
    imageSize = '1K',
    responseModalities = ['TEXT', 'IMAGE'],
    enableGoogleSearch = false,
  } = request;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AgentError(
      AgentErrorType.CONFIGURATION_ERROR,
      'GEMINI_API_KEY is not configured'
    );
  }

  try {

    // Build contents array with conversation history
    const contents: any[] = [...conversationHistory];

    // Add new user message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    // Build request body
    const requestBody: any = {
      contents,
      generationConfig: {
        responseModalities,
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    };

    // Add Google Search tool if enabled
    if (enableGoogleSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const responseParts = candidate?.content?.parts || [];

    const images: { base64: string; mimeType: string }[] = [];
    let textResponse = '';
    const newModelParts: any[] = [];

    for (const part of responseParts) {
      // Skip thought parts
      if (part.thought) continue;

      if (part.text) {
        textResponse = part.text;
        newModelParts.push({
          text: part.text,
          ...(part.thought_signature && { thought_signature: part.thought_signature }),
        });
      } else if (part.inlineData) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        });
        newModelParts.push({
          inline_data: {
            mime_type: part.inlineData.mimeType || 'image/png',
            data: part.inlineData.data,
          },
          ...(part.thought_signature && { thought_signature: part.thought_signature }),
        });
      }
    }

    // Build updated conversation history
    const updatedHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', parts: [{ text: prompt }] },
      { role: 'model', parts: newModelParts },
    ];


    return {
      success: true,
      images,
      text: textResponse,
      conversationHistory: updatedHistory,
    };
  } catch (error) {
    throw new AgentError(
      AgentErrorType.GENERATION_FAILED,
      error instanceof Error ? error.message : 'Failed to edit image with Gemini'
    );
  }
}

export default {
  editImageWithGemini,
  generateGemini3ProImage,
  multiTurnEditWithGemini,
};
