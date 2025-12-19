/**
 * Instagram API Client Utility
 * Handles Instagram Graph API OAuth 2.0 and content publishing
 * Note: Instagram API requires a Facebook Business account
 */

import { createHmac } from 'crypto'

/**
 * Instagram OAuth 2.0 URLs (via Facebook)
 */
export const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v24.0/dialog/oauth';
export const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v24.0/oauth/access_token';
export const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v24.0';
export const FACEBOOK_GRAPH_BASE = 'https://graph.facebook.com/v24.0';

/**
 * Generate appsecret_proof for Instagram server-to-server calls
 * This is required when making API calls from the backend with an app secret
 */
export function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex')
}

/**
 * Required OAuth scopes for Instagram (via Facebook Login)
 * Reference: https://developers.facebook.com/docs/instagram-platform/overview
 * 
 * - instagram_basic: Basic access to Instagram business account data
 * - instagram_content_publish: Create posts (images, videos, carousels)
 * - instagram_manage_insights: Get analytics (reach, impressions, engagement)
 * - instagram_manage_comments: Read, reply to, and manage comments on Instagram posts
 * - pages_show_list: List pages managed by the user
 * - pages_read_engagement: Read engagement metrics on posts
 */
export const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments', // Required for Comment Agent
  'pages_show_list',
  'pages_read_engagement',
];

/**
 * Generate Instagram OAuth authorization URL (via Facebook)
 */
export function generateInstagramAuthUrl(
  appId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: state,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
  });

  return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get long-lived access token (60 days)
 */
export async function getLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to get long-lived token');
  }

  return response.json();
}

/**
 * Refresh long-lived access token
 * Instagram/Facebook long-lived tokens can be refreshed before they expire
 * New token is valid for 60 days from refresh
 * Token must be at least 24 hours old and not expired to be refreshed
 */
export async function refreshLongLivedToken(
  longLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: longLivedToken,
  });

  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to refresh long-lived token');
  }

  return response.json();
}

/**
 * Get Facebook Pages connected to the account
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getFacebookPages(accessToken: string, appSecretProof?: string): Promise<{
  data: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
}> {
  let url = `${FACEBOOK_GRAPH_BASE}/me/accounts?access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook pages');
  }

  return response.json();
}

/**
 * Get Instagram Business Account ID from Facebook Page
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string,
  appSecretProof?: string
): Promise<string | null> {
  let url = `${FACEBOOK_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram business account');
  }

  const data = await response.json();
  return data.instagram_business_account?.id || null;
}

/**
 * Get Instagram account info
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getInstagramAccountInfo(
  igUserId: string,
  accessToken: string,
  appSecretProof?: string
): Promise<{
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}> {
  let url = `${FACEBOOK_GRAPH_BASE}/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram account info');
  }

  return response.json();
}

/**
 * Create Instagram media container (Step 1 of posting)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createMediaContainer(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create media container');
  }

  if (!data.id) {
    throw new Error('Media ID is not available - container creation failed');
  }

  return data;
}

/**
 * Helper to detect if URL is a video
 * Supports common video extensions and content-type hints in URLs
 */
function isVideoUrl(url: string): boolean {
  if (!url) return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Check for video file extensions (with or without query params)
  if (lowerUrl.match(/\.(mp4|mov|m4v|3gp)(\?|$)/i)) {
    return true;
  }
  
  // Check for Supabase storage video paths
  if (lowerUrl.includes('/video/') || lowerUrl.includes('/videos/')) {
    return true;
  }
  
  return false;
}

/**
 * Create a single carousel item container (image or video)
 * Returns the container ID
 */
async function createCarouselItemContainer(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  isVideo: boolean,
  appSecretProof?: string
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
  });

  // For carousel items, we need is_carousel_item=true
  // For images: just image_url
  // For videos: video_url + media_type=VIDEO
  if (isVideo) {
    params.append('media_type', 'VIDEO');
    params.append('video_url', mediaUrl);
    params.append('is_carousel_item', 'true');
  } else {
    params.append('image_url', mediaUrl);
    params.append('is_carousel_item', 'true');
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    const errorMsg = data.error?.message || data.error?.error_user_msg || 'Unknown error';
    throw new Error(`Failed to create carousel item: ${errorMsg}`);
  }

  if (!data.id) {
    throw new Error('No container ID returned for carousel item');
  }

  return data.id;
}

/**
 * Wait for a container to reach FINISHED status
 * Required for videos before they can be published or added to carousel
 */
async function waitForContainerFinished(
  containerId: string,
  accessToken: string,
  appSecretProof?: string,
  maxWaitSeconds: number = 120
): Promise<void> {
  const startTime = Date.now();
  const pollIntervalMs = 3000; // Check every 3 seconds
  
  while (true) {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    
    if (elapsedSeconds > maxWaitSeconds) {
      throw new Error(`Timeout: Container ${containerId} did not finish processing within ${maxWaitSeconds}s`);
    }
    
    try {
      const status = await checkContainerStatus(containerId, accessToken, appSecretProof);
      const statusCode = status.status_code || status.status || '';
      
      
      if (statusCode === 'FINISHED') {
        return;
      }
      
      if (statusCode === 'ERROR') {
        throw new Error(`Container processing failed: ${status.status || 'Unknown error'}`);
      }
      
      if (statusCode === 'EXPIRED') {
        throw new Error('Container expired before processing completed');
      }
      
      // Still IN_PROGRESS, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      
    } catch (error) {
      const msg = (error as Error).message || '';
      // If it's our own error, rethrow
      if (msg.includes('Timeout') || msg.includes('failed') || msg.includes('expired')) {
        throw error;
      }
      // Otherwise it might be a transient API error, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }
}

/**
 * Create Instagram carousel container (for multiple images and videos)
 * 
 * Instagram Carousel Publishing Flow (per official docs):
 * 1. Create individual item containers with is_carousel_item=true
 * 2. For videos: wait for each to reach FINISHED status
 * 3. Create parent CAROUSEL container with children IDs
 * 4. Wait for carousel container to reach FINISHED status
 * 5. Publish using media_publish endpoint
 * 
 * Supports: 2-10 items, mixed images (JPEG/PNG) and videos (MP4/MOV)
 */
export async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  mediaUrls: string[],
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  
  const childContainerIds: string[] = [];

  // STEP 1: Create individual item containers
  for (let i = 0; i < mediaUrls.length; i++) {
    const mediaUrl = mediaUrls[i];
    const isVideo = isVideoUrl(mediaUrl);
    
    
    try {
      const containerId = await createCarouselItemContainer(
        igUserId,
        accessToken,
        mediaUrl,
        isVideo,
        appSecretProof
      );
      
      
      // STEP 2: For videos, wait for processing to complete
      if (isVideo) {
        await waitForContainerFinished(containerId, accessToken, appSecretProof, 180); // 3 min max for videos
      }
      
      childContainerIds.push(containerId);
      
    } catch (error) {
      throw new Error(`Carousel item ${i + 1} failed: ${(error as Error).message}`);
    }
  }

  // STEP 3: Create parent carousel container
  
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childContainerIds.join(','),
    access_token: accessToken,
  });
  
  // Only add caption if not empty
  if (caption && caption.trim()) {
    params.append('caption', caption);
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    const errorMsg = data.error?.message || data.error?.error_user_msg || 'Unknown error';
    throw new Error(`Carousel container creation failed: ${errorMsg}`);
  }

  if (!data.id) {
    throw new Error('No container ID returned for carousel');
  }

  
  return { id: data.id };
}

/**
 * Check the status of a media container (required for videos/carousels)
 * Videos need to be processed before publishing
 * 
 * Status codes:
 * - EXPIRED: Container expired (24 hours)
 * - ERROR: Processing failed
 * - FINISHED: Ready to publish
 * - IN_PROGRESS: Still processing
 * - PUBLISHED: Already published
 */
export async function checkContainerStatus(
  containerId: string,
  accessToken: string,
  appSecretProof?: string
): Promise<{ status: string; status_code?: string; id?: string }> {
  const params = new URLSearchParams({
    fields: 'id,status,status_code',
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${containerId}?${params.toString()}`,
    {
      method: 'GET',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to check container status');
  }

  return data;
}

/**
 * Wait for a media container to finish processing
 * Polls the status until FINISHED or error
 */
export async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  appSecretProof?: string,
  maxAttempts: number = 30,
  delayMs: number = 2000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkContainerStatus(containerId, accessToken, appSecretProof);
    
    
    if (status.status_code === 'FINISHED' || status.status === 'FINISHED') {
      return true;
    }
    
    if (status.status_code === 'ERROR' || status.status === 'ERROR') {
      throw new Error('Media container processing failed');
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error('Timeout waiting for media container to process');
}

/**
 * Create Instagram video container (for regular videos)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createVideoContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  
  // Validate videoUrl
  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('Invalid parameter: video_url is required and must be a string');
  }
  
  const params = new URLSearchParams({
    media_type: 'VIDEO',
    video_url: videoUrl,
    access_token: accessToken,
  });

  // Only add caption if not empty (Instagram rejects empty caption for videos)
  if (caption && caption.trim()) {
    params.append('caption', caption);
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }


  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create video container');
  }
  

  return data;
}

/**
 * Create Instagram Reels container
 * Reels are short-form vertical videos (9:16 aspect ratio recommended)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createReelsContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  appSecretProof?: string,
  shareToFeed: boolean = true
): Promise<{ id: string }> {
  
  // Validate videoUrl
  if (!videoUrl || typeof videoUrl !== 'string') {
    throw new Error('Invalid parameter: video_url is required and must be a string');
  }
  
  const params = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    share_to_feed: shareToFeed.toString(),
    access_token: accessToken,
  });

  // Only add caption if not empty (Instagram rejects empty caption for videos)
  if (caption && caption.trim()) {
    params.append('caption', caption);
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }


  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create Reels container');
  }

  return data;
}

/**
 * Create Instagram Story container
 * Stories are temporary posts that disappear after 24 hours
 * Supports both images and videos
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createStoryContainer(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  isVideo: boolean = false,
  appSecretProof?: string
): Promise<{ id: string }> {
  
  const params = new URLSearchParams({
    media_type: 'STORIES',
    access_token: accessToken,
  });

  // Add the appropriate URL parameter based on media type
  if (isVideo) {
    params.append('video_url', mediaUrl);
  } else {
    params.append('image_url', mediaUrl);
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create Story container');
  }

  if (!data.id) {
    throw new Error('No container ID returned for Story');
  }

  return data;
}

/**
 * Publish media container to Instagram
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function publishMediaContainer(
  igUserId: string,
  accessToken: string,
  creationId: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to publish media container');
  }

  if (!data.id) {
    throw new Error('Post ID is not available after publishing');
  }

  return data;
}

/**
 * Upload image to a publicly accessible URL
 * Instagram requires images to be hosted at a public URL
 * This is a helper to upload to Supabase Storage
 */
export async function uploadImageToStorage(
  imageBuffer: Buffer,
  fileName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  // Upload to Supabase Storage
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
  formData.append('file', blob, fileName);

  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/media/${fileName}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image to storage');
  }

  // Return public URL
  return `${supabaseUrl}/storage/v1/object/public/media/${fileName}`;
}

/**
 * Get Instagram media insights (analytics)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getMediaInsights(
  mediaId: string,
  accessToken: string,
  appSecretProof?: string
): Promise<{
  data: Array<{
    name: string;
    values: Array<{ value: number }>;
  }>;
}> {
  const metrics = ['engagement', 'impressions', 'reach', 'saved'];

  let url = `${FACEBOOK_GRAPH_BASE}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch media insights');
  }

  return response.json();
}
