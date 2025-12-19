/**
 * Facebook API
 * 
 * API client for Facebook posting operations including regular posts,
 * photos, videos, reels, stories, and carousels.
 */

import { get, post } from '../../client';
import { ENDPOINTS } from '../../config';
import type {
    FacebookPostRequest,
    FacebookCarouselRequest,
    FacebookUploadMediaRequest,
    FacebookPostResponse,
    FacebookCarouselResponse,
    FacebookUploadResponse,
    VerifyCredentialsResponse,
    PlatformApiInfo,
} from '../../types';

/**
 * Create a Facebook post
 * 
 * Posts content to a Facebook Page. Supports text, photos, videos, reels, and stories.
 * 
 * @param request - Post request with content and media
 * @returns Promise resolving to post response with ID and URL
 */
export async function createPost(
    request: FacebookPostRequest
): Promise<FacebookPostResponse> {
    return post<FacebookPostResponse>(
        ENDPOINTS.social.facebook.post,
        request
    );
}

/**
 * Create a Facebook carousel post
 * 
 * Posts a multi-photo carousel to Facebook Page.
 * Requires at least 2 images.
 * 
 * @param request - Carousel request with message and image URLs
 * @returns Promise resolving to carousel post response
 */
export async function createCarousel(
    request: FacebookCarouselRequest
): Promise<FacebookCarouselResponse> {
    return post<FacebookCarouselResponse>(
        ENDPOINTS.social.facebook.carousel,
        request
    );
}

/**
 * Upload media for Facebook
 * 
 * Uploads media to storage and returns a public URL for Facebook API.
 * Facebook requires publicly accessible URLs for media.
 * 
 * @param request - Upload request with base64 media data
 * @returns Promise resolving to upload response with URL
 */
export async function uploadMedia(
    request: FacebookUploadMediaRequest
): Promise<FacebookUploadResponse> {
    return post<FacebookUploadResponse>(
        ENDPOINTS.social.facebook.uploadMedia,
        request
    );
}

/**
 * Verify Facebook connection
 * 
 * Checks if Facebook is connected and returns page info.
 * 
 * @returns Promise resolving to verification response
 */
export async function verifyCredentials(): Promise<VerifyCredentialsResponse> {
    return get<VerifyCredentialsResponse>(ENDPOINTS.social.facebook.verify);
}

/**
 * Get Facebook API info
 * 
 * Retrieves information about the Facebook API service.
 * 
 * @returns Promise resolving to API info
 */
export async function getInfo(): Promise<PlatformApiInfo> {
    return get<PlatformApiInfo>(ENDPOINTS.social.facebook.base);
}

/**
 * Post text only to Facebook
 * 
 * Convenience function for posting text content without media.
 * 
 * @param message - Text content to post
 * @param link - Optional link to share
 * @returns Promise resolving to post response
 */
export async function postText(
    message: string,
    link?: string
): Promise<FacebookPostResponse> {
    return createPost({ message, link });
}

/**
 * Post photo to Facebook
 * 
 * Convenience function for posting a single photo.
 * 
 * @param message - Caption for the photo
 * @param imageUrl - URL of the image to post
 * @returns Promise resolving to post response
 */
export async function postPhoto(
    message: string,
    imageUrl: string
): Promise<FacebookPostResponse> {
    return createPost({
        message,
        imageUrl,
        mediaType: 'image',
        postType: 'post',
    });
}

/**
 * Post video to Facebook
 * 
 * Convenience function for posting a video.
 * 
 * @param message - Description for the video
 * @param videoUrl - URL of the video to post
 * @returns Promise resolving to post response
 */
export async function postVideo(
    message: string,
    videoUrl: string
): Promise<FacebookPostResponse> {
    return createPost({
        message,
        imageUrl: videoUrl,
        mediaType: 'video',
        postType: 'post',
    });
}

/**
 * Post a Facebook Reel
 * 
 * Convenience function for posting short-form vertical video as a Reel.
 * 
 * @param description - Description for the reel
 * @param videoUrl - URL of the vertical video
 * @returns Promise resolving to post response
 */
export async function postReel(
    description: string,
    videoUrl: string
): Promise<FacebookPostResponse> {
    return createPost({
        message: description,
        imageUrl: videoUrl,
        mediaType: 'video',
        postType: 'reel',
    });
}

/**
 * Post a Facebook Story
 * 
 * Convenience function for posting temporary 24-hour stories.
 * 
 * @param mediaUrl - URL of the image or video
 * @param isVideo - Whether the media is a video
 * @returns Promise resolving to post response
 */
export async function postStory(
    mediaUrl: string,
    isVideo: boolean = false
): Promise<FacebookPostResponse> {
    return createPost({
        message: '',
        imageUrl: mediaUrl,
        mediaType: isVideo ? 'video' : 'image',
        postType: 'story',
    });
}

/**
 * Upload and post image
 * 
 * Convenience function that handles base64 upload and posting in one call.
 * 
 * @param message - Caption for the photo
 * @param base64Data - Base64 encoded image data
 * @returns Promise resolving to post response
 */
export async function uploadAndPostImage(
    message: string,
    base64Data: string
): Promise<FacebookPostResponse> {
    const uploadResult = await uploadMedia({ mediaData: base64Data });
    return createPost({
        message,
        imageUrl: uploadResult.imageUrl,
        mediaType: 'image',
    });
}
