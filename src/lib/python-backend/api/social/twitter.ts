/**
 * Twitter/X API
 * 
 * API client for Twitter posting operations including tweets,
 * media uploads, and threads.
 */

import { get, post } from '../../client';
import { ENDPOINTS } from '../../config';
import type {
    TwitterPostRequest,
    TwitterUploadMediaRequest,
    TwitterPostResponse,
    TwitterUploadResponse,
    VerifyCredentialsResponse,
    PlatformApiInfo,
} from '../../types';

/**
 * Create a tweet
 * 
 * Posts a tweet to Twitter. Supports text and media attachments.
 * 
 * @param request - Tweet request with text and optional media IDs
 * @returns Promise resolving to tweet response with ID and URL
 */
export async function createPost(
    request: TwitterPostRequest
): Promise<TwitterPostResponse> {
    return post<TwitterPostResponse>(
        ENDPOINTS.social.twitter.post,
        request
    );
}

/**
 * Upload media for Twitter
 * 
 * Uploads media to Twitter and returns a media ID for attachment.
 * 
 * @param request - Upload request with base64 media data and type
 * @returns Promise resolving to upload response with media ID
 */
export async function uploadMedia(
    request: TwitterUploadMediaRequest
): Promise<TwitterUploadResponse> {
    return post<TwitterUploadResponse>(
        ENDPOINTS.social.twitter.uploadMedia,
        request
    );
}

/**
 * Verify Twitter connection
 * 
 * Checks if Twitter is connected and returns account info.
 * 
 * @returns Promise resolving to verification response
 */
export async function verifyCredentials(): Promise<VerifyCredentialsResponse> {
    return get<VerifyCredentialsResponse>(ENDPOINTS.social.twitter.verify);
}

/**
 * Get Twitter API info
 * 
 * Retrieves information about the Twitter API service.
 * 
 * @returns Promise resolving to API info
 */
export async function getInfo(): Promise<PlatformApiInfo> {
    return get<PlatformApiInfo>(ENDPOINTS.social.twitter.base);
}

/**
 * Post text tweet
 * 
 * Convenience function for posting a text-only tweet.
 * 
 * @param text - Tweet text (max 280 characters)
 * @returns Promise resolving to tweet response
 */
export async function postText(text: string): Promise<TwitterPostResponse> {
    return createPost({ text });
}

/**
 * Post tweet with image
 * 
 * Convenience function for posting a tweet with an image.
 * 
 * @param text - Tweet text
 * @param base64Data - Base64 encoded image data
 * @returns Promise resolving to tweet response
 */
export async function postWithImage(
    text: string,
    base64Data: string
): Promise<TwitterPostResponse> {
    const uploadResult = await uploadMedia({
        mediaData: base64Data,
        mediaType: 'image',
    });
    return createPost({
        text,
        mediaIds: [uploadResult.mediaId],
    });
}

/**
 * Post tweet with video
 * 
 * Convenience function for posting a tweet with a video.
 * 
 * @param text - Tweet text
 * @param base64Data - Base64 encoded video data
 * @returns Promise resolving to tweet response
 */
export async function postWithVideo(
    text: string,
    base64Data: string
): Promise<TwitterPostResponse> {
    const uploadResult = await uploadMedia({
        mediaData: base64Data,
        mediaType: 'video',
    });
    return createPost({
        text,
        mediaIds: [uploadResult.mediaId],
    });
}

/**
 * Post tweet with GIF
 * 
 * Convenience function for posting a tweet with an animated GIF.
 * 
 * @param text - Tweet text
 * @param base64Data - Base64 encoded GIF data
 * @returns Promise resolving to tweet response
 */
export async function postWithGif(
    text: string,
    base64Data: string
): Promise<TwitterPostResponse> {
    const uploadResult = await uploadMedia({
        mediaData: base64Data,
        mediaType: 'gif',
    });
    return createPost({
        text,
        mediaIds: [uploadResult.mediaId],
    });
}

/**
 * Post tweet with multiple images
 * 
 * Posts a tweet with up to 4 images attached.
 * 
 * @param text - Tweet text
 * @param base64Images - Array of base64 encoded image data (max 4)
 * @returns Promise resolving to tweet response
 */
export async function postWithMultipleImages(
    text: string,
    base64Images: string[]
): Promise<TwitterPostResponse> {
    const mediaIds: string[] = [];

    for (const imageData of base64Images.slice(0, 4)) {
        const uploadResult = await uploadMedia({
            mediaData: imageData,
            mediaType: 'image',
        });
        mediaIds.push(uploadResult.mediaId);
    }

    return createPost({
        text,
        mediaIds,
    });
}

/**
 * Upload multiple media items
 * 
 * Uploads multiple media items and returns their IDs.
 * 
 * @param mediaItems - Array of media items to upload
 * @returns Promise resolving to array of media IDs
 */
export async function uploadMultipleMedia(
    mediaItems: Array<{ data: string; type: 'image' | 'video' | 'gif' }>
): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of mediaItems) {
        const uploadResult = await uploadMedia({
            mediaData: item.data,
            mediaType: item.type,
        });
        mediaIds.push(uploadResult.mediaId);
    }

    return mediaIds;
}
