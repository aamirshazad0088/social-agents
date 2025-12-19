/**
 * TikTok API
 * 
 * API client for TikTok video posting operations.
 */

import { get, post } from '../../client';
import { ENDPOINTS } from '../../config';
import type {
    TikTokPostRequest,
    TikTokPostResponse,
    VerifyCredentialsResponse,
    PlatformApiInfo,
} from '../../types';

/**
 * Create a TikTok post
 * 
 * Uploads and posts a video to TikTok.
 * 
 * @param request - Post request with video URL and caption
 * @returns Promise resolving to post response with publish ID and status
 */
export async function createPost(
    request: TikTokPostRequest
): Promise<TikTokPostResponse> {
    return post<TikTokPostResponse>(
        ENDPOINTS.social.tiktok.post,
        request
    );
}

/**
 * Proxy media download
 * 
 * Downloads media through the backend proxy for TikTok access.
 * TikTok requires specific headers that browsers cannot send.
 * 
 * @param url - URL of the media to proxy
 * @returns Promise resolving to proxied media URL
 */
export async function proxyMedia(
    url: string
): Promise<{ url: string }> {
    return get<{ url: string }>(ENDPOINTS.social.tiktok.proxyMedia, {
        params: { url },
    });
}

/**
 * Verify TikTok connection
 * 
 * Checks if TikTok is connected and returns account info.
 * 
 * @returns Promise resolving to verification response
 */
export async function verifyCredentials(): Promise<VerifyCredentialsResponse> {
    return get<VerifyCredentialsResponse>(ENDPOINTS.social.tiktok.verify);
}

/**
 * Get TikTok API info
 * 
 * Retrieves information about the TikTok API service.
 * 
 * @returns Promise resolving to API info
 */
export async function getInfo(): Promise<PlatformApiInfo> {
    return get<PlatformApiInfo>(ENDPOINTS.social.tiktok.base);
}

/**
 * Post video to TikTok
 * 
 * Convenience function for posting a video with caption.
 * 
 * @param caption - Caption for the video
 * @param videoUrl - URL of the video to post
 * @param coverUrl - Optional cover image URL
 * @returns Promise resolving to post response
 */
export async function postVideo(
    caption: string,
    videoUrl: string,
    coverUrl?: string
): Promise<TikTokPostResponse> {
    return createPost({
        caption,
        videoUrl,
        coverUrl,
    });
}

/**
 * Check publishing status
 * 
 * TikTok publishing is asynchronous. This checks the status of a publish request.
 * 
 * @param publishId - Publish ID from initial post request
 * @returns Promise resolving to current status
 */
export async function getPublishStatus(
    publishId: string
): Promise<{
    status: 'processing' | 'published' | 'failed';
    videoId?: string;
    error?: string;
}> {
    return get(`${ENDPOINTS.social.tiktok.base}/status/${publishId}`);
}

/**
 * Post video and wait for completion
 * 
 * Posts a video and polls until publishing is complete.
 * 
 * @param caption - Caption for the video
 * @param videoUrl - URL of the video to post
 * @param coverUrl - Optional cover image URL
 * @param maxAttempts - Maximum polling attempts (default: 30)
 * @param intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns Promise resolving to final publish status
 */
export async function postVideoAndWait(
    caption: string,
    videoUrl: string,
    coverUrl?: string,
    maxAttempts: number = 30,
    intervalMs: number = 5000
): Promise<{
    success: boolean;
    videoId?: string;
    error?: string;
}> {
    const postResult = await createPost({
        caption,
        videoUrl,
        coverUrl,
    });

    if (!postResult.success) {
        return {
            success: false,
            error: 'Failed to initiate post',
        };
    }

    let attempts = 0;
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        const status = await getPublishStatus(postResult.publishId);

        if (status.status === 'published') {
            return {
                success: true,
                videoId: status.videoId,
            };
        }

        if (status.status === 'failed') {
            return {
                success: false,
                error: status.error || 'Publishing failed',
            };
        }

        attempts++;
    }

    return {
        success: false,
        error: 'Publishing timed out',
    };
}
