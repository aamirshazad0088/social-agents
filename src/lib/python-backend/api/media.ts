/**
 * Media Generation API
 * 
 * API client for media generation and prompt improvement.
 * Handles image, video, and audio generation requests.
 */

import { post, get } from '../client';
import { ENDPOINTS } from '../config';
import type {
    MediaGenerationRequest,
    MediaGenerationResponse,
    PromptImprovementRequest,
    PromptImprovementResponse,
    CommentGenerationRequest,
    CommentGenerationResponse,
} from '../types';

/**
 * Generate media using AI
 * 
 * Generates images, videos, or audio based on the provided prompt.
 * 
 * @param request - Generation request with prompt and media type
 * @returns Promise resolving to generated media URL or operation status
 * 
 * @example
 * ```typescript
 * const result = await generateMedia({
 *   prompt: "A futuristic cityscape at sunset",
 *   type: "image",
 *   model: "gemini-imagen"
 * });
 * console.log("Generated:", result.url);
 * ```
 */
export async function generateMedia(
    request: MediaGenerationRequest
): Promise<MediaGenerationResponse> {
    return post<MediaGenerationResponse>(
        ENDPOINTS.media.generate,
        request
    );
}

/**
 * Improve a media generation prompt
 * 
 * Uses AI to enhance and expand a prompt for better generation results.
 * 
 * @param request - Prompt improvement request
 * @returns Promise resolving to improved prompt with suggestions
 * 
 * @example
 * ```typescript
 * const result = await improvePrompt({
 *   originalPrompt: "sunset beach",
 *   mediaType: "image",
 *   style: "photorealistic"
 * });
 * console.log("Improved:", result.improvedPrompt);
 * ```
 */
export async function improvePrompt(
    request: PromptImprovementRequest
): Promise<PromptImprovementResponse> {
    return post<PromptImprovementResponse>(
        ENDPOINTS.media.improvePrompt,
        request
    );
}

/**
 * Generate social media comments
 * 
 * Creates AI-generated comments for social media posts.
 * 
 * @param request - Comment generation request
 * @returns Promise resolving to generated comments
 * 
 * @example
 * ```typescript
 * const result = await generateComments({
 *   postContent: "Just launched our new product!",
 *   platform: "instagram",
 *   tone: "enthusiastic",
 *   count: 5
 * });
 * console.log("Comments:", result.comments);
 * ```
 */
export async function generateComments(
    request: CommentGenerationRequest
): Promise<CommentGenerationResponse> {
    return post<CommentGenerationResponse>(
        ENDPOINTS.comments.generate,
        request
    );
}
