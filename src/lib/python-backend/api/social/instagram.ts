/**
 * Instagram API
 * 
 * API client for Instagram posting operations including photos,
 * videos, carousels, reels, and stories.
 */

import { get, post } from '../../client';
import { ENDPOINTS } from '../../config';
import type {
    InstagramPostRequest,
    InstagramUploadMediaRequest,
    InstagramPostResponse,
    InstagramUploadResponse,
    VerifyCredentialsResponse,
    PlatformApiInfo,
} from '../../types';

/**
 * Create an Instagram post
 * 
 * Posts content to Instagram. Supports photos, videos, carousels, reels, and stories.
 * 
 * @param request - Post request with content and media
 * @returns Promise resolving to post response with ID and URL
 */
export async function createPost(
    request: InstagramPostRequest
): Promise<InstagramPostResponse> {
    return post<InstagramPostResponse>(
        ENDPOINTS.social.instagram.post,
        request
    );
}

/**
 * Upload media for Instagram
 * 
 * Uploads media to storage and returns a public URL for Instagram API.
 * Instagram APIs require publicly accessible URLs for media.
 * 
 * @param request - Upload request with base64 media data
 * @returns Promise resolving to upload response with URL
 */
export async function uploadMedia(
    request: InstagramUploadMediaRequest
): Promise<InstagramUploadResponse> {
    return post<InstagramUploadResponse>(
        ENDPOINTS.social.instagram.uploadMedia,
        request
    );
}

/**
 * Verify Instagram connection
 * 
 * Checks if Instagram is connected and returns account info.
 * 
 * @returns Promise resolving to verification response
 */
export async function verifyCredentials(): Promise<VerifyCredentialsResponse> {
    return get<VerifyCredentialsResponse>(ENDPOINTS.social.instagram.verify);
}

/**
 * Get Instagram API info
 * 
 * Retrieves information about the Instagram API service.
 * 
 * @returns Promise resolving to API info
 */
export async function getInfo(): Promise<PlatformApiInfo> {
    return get<PlatformApiInfo>(ENDPOINTS.social.instagram.base);
}

/**
 * Post photo to Instagram
 * 
 * Convenience function for posting a single photo.
 * 
 * @param caption - Caption for the photo
 * @param imageUrl - URL of the image to post
 * @returns Promise resolving to post response
 */
export async function postPhoto(
    caption: string,
    imageUrl: string
): Promise<InstagramPostResponse> {
    return createPost({
        caption,
        imageUrl,
        mediaType: 'image',
    });
}

/**
 * Post video to Instagram
 * 
 * Convenience function for posting a video.
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
): Promise<InstagramPostResponse> {
    return createPost({
        caption,
        videoUrl,
        coverUrl,
        mediaType: 'video',
    });
}

/**
 * Post carousel to Instagram
 * 
 * Posts a multi-image carousel. Requires 2-10 images.
 * 
 * @param caption - Caption for the carousel
 * @param imageUrls - Array of image URLs (2-10 images)
 * @returns Promise resolving to post response
 */
export async function postCarousel(
    caption: string,
    imageUrls: string[]
): Promise<InstagramPostResponse> {
    return createPost({
        caption,
        carouselImages: imageUrls,
        mediaType: 'carousel',
    });
}

/**
 * Post Reel to Instagram
 * 
 * Posts a short-form vertical video as a Reel.
 * 
 * @param caption - Caption for the reel
 * @param videoUrl - URL of the vertical video
 * @param coverUrl - Optional cover image URL
 * @param shareToFeed - Whether to also share to main feed (default: true)
 * @returns Promise resolving to post response
 */
export async function postReel(
    caption: string,
    videoUrl: string,
    coverUrl?: string,
    shareToFeed: boolean = true
): Promise<InstagramPostResponse> {
    return createPost({
        caption,
        videoUrl,
        coverUrl,
        shareToFeed,
        mediaType: 'reel',
    });
}

/**
 * Post Story to Instagram
 * 
 * Posts a temporary 24-hour story.
 * 
 * @param imageUrl - URL of image for story (optional if video provided)
 * @param videoUrl - URL of video for story (optional if image provided)
 * @returns Promise resolving to post response
 */
export async function postStory(
    imageUrl?: string,
    videoUrl?: string
): Promise<InstagramPostResponse> {
    return createPost({
        caption: '',
        imageUrl,
        videoUrl,
        mediaType: 'story',
    });
}

/**
 * Upload and post image
 * 
 * Convenience function that handles base64 upload and posting in one call.
 * 
 * @param caption - Caption for the photo
 * @param base64Data - Base64 encoded image data
 * @returns Promise resolving to post response
 */
export async function uploadAndPostImage(
    caption: string,
    base64Data: string
): Promise<InstagramPostResponse> {
    const uploadResult = await uploadMedia({ mediaData: base64Data });
    return createPost({
        caption,
        imageUrl: uploadResult.imageUrl,
        mediaType: 'image',
    });
}
