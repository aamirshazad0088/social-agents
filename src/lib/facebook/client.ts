/**
 * Facebook API Client Utility
 * Handles Facebook Graph API OAuth 2.0 and content publishing
 */

import { createHmac } from 'crypto'

/**
 * Facebook OAuth 2.0 URLs
 */
// Use versioned OAuth endpoints to align with latest login experience
export const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v24.0/dialog/oauth';
export const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v24.0/oauth/access_token';
export const FACEBOOK_GRAPH_BASE = 'https://graph.facebook.com/v24.0';

/**
 * Generate appsecret_proof for Facebook server-to-server calls
 * This is required when making API calls from the backend with an app secret
 */
export function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex')
}

/**
 * Facebook OAuth Scopes Configuration
 *
 * DEVELOPMENT SCOPES (Available without App Review):
 * - pages_show_list: List pages managed by user
 * - pages_read_engagement: Read comments, reactions, and engagement data
 * - pages_manage_metadata: Manage page metadata
 * - instagram_basic: Basic Instagram access
 * - instagram_manage_insights: Instagram analytics
 * - business_management: Business account management
 * - public_profile: Basic profile access
 *
 * PRODUCTION SCOPES (Require App Review):
 * - pages_manage_posts: Create posts on pages
 * - read_insights: Get analytics (impressions, clicks, performance metrics)
 */

/**
 * Development scopes - Available in Development Mode
 * Reference: https://developers.facebook.com/docs/permissions/reference/
 * 
 * Note: pages_manage_engagement is NOT a valid scope!
 * For comments, use instagram_manage_comments (for IG) and pages_read_engagement (for FB)
 */
export const FACEBOOK_DEVELOPMENT_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_manage_comments', // Required for Comment Agent - read/reply to Instagram comments
  'business_management',
  // Meta Ads permissions - required for ad management
  'ads_management',
  'ads_read',
];

/**
 * Production scopes - Require Facebook App Review
 * Reference: https://developers.facebook.com/docs/permissions/reference/
 */
export const FACEBOOK_PRODUCTION_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_manage_comments', // Required for Comment Agent - read/reply to Instagram comments
  'business_management',
  // Meta Ads permissions - required for ad management
  'ads_management',
  'ads_read',
];

/**
 * Get appropriate scopes based on environment and configuration
 * @param useAdvancedScopes - Force use of production scopes (default: based on NODE_ENV)
 */
export function getFacebookScopes(useAdvancedScopes?: boolean): string[] {
  // Allow explicit override via parameter or environment variable
  const forceAdvanced = useAdvancedScopes !== undefined
    ? useAdvancedScopes
    : process.env.FACEBOOK_USE_ADVANCED_SCOPES === 'true';

  return forceAdvanced ? FACEBOOK_PRODUCTION_SCOPES : FACEBOOK_DEVELOPMENT_SCOPES;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getFacebookScopes() instead
 */
export const FACEBOOK_SCOPES = FACEBOOK_PRODUCTION_SCOPES;

/**
 * Generate Facebook OAuth authorization URL
 */
export function generateFacebookAuthUrl(
  appId: string,
  redirectUri: string,
  state: string,
  useAdvancedScopes?: boolean
): string {
  // Get appropriate scopes based on environment
  const scopes = getFacebookScopes(useAdvancedScopes);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: state,
    scope: scopes.join(','),
    response_type: 'code',
    auth_type: 'rerequest',
    // Use popup display to avoid cookie consent page issues
    display: 'popup',
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
 * Get Facebook Pages managed by the user
 * @param accessToken The access token
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getFacebookPages(accessToken: string, appSecretProof?: string): Promise<{
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category: string;
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
 * Get Facebook Page info
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getPageInfo(
  pageId: string,
  pageAccessToken: string,
  appSecretProof?: string
): Promise<{
  id: string;
  name: string;
  category: string;
  fan_count?: number;
}> {
  let url = `${FACEBOOK_GRAPH_BASE}/${pageId}?fields=id,name,category,fan_count&access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch page info');
  }

  return response.json();
}

/**
 * Post to Facebook Page
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function postToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  message: string,
  link?: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    message: message,
    access_token: pageAccessToken,
  });

  if (link) {
    params.append('link', link);
  }

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/feed`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to post to Facebook');
  }

  return response.json();
}

/**
 * Post photo to Facebook Page
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function postPhotoToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  message: string,
  appSecretProof?: string
): Promise<{ id: string; post_id: string }> {
  const params = new URLSearchParams({
    url: imageUrl,
    caption: message,
    access_token: pageAccessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/photos`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to post photo to Facebook');
  }

  return response.json();
}

/**
 * Upload photo and get photo ID (for multi-photo posts)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function uploadPhotoToFacebook(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({
    url: imageUrl,
    published: 'false', // Don't publish yet
    access_token: pageAccessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/photos`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload photo');
  }

  return response.json();
}

/**
 * Create multi-photo post
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function createMultiPhotoPost(
  pageId: string,
  pageAccessToken: string,
  photoIds: string[],
  message: string,
  appSecretProof?: string
): Promise<{ id: string }> {
  const attachedMedia = photoIds.map(id => ({ media_fbid: id }));

  const params = new URLSearchParams({
    message: message,
    attached_media: JSON.stringify(attachedMedia),
    access_token: pageAccessToken,
  });

  if (appSecretProof) {
    params.append('appsecret_proof', appSecretProof);
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/feed`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create multi-photo post');
  }

  return response.json();
}

/**
 * Get post insights (analytics)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getPostInsights(
  postId: string,
  pageAccessToken: string,
  appSecretProof?: string
): Promise<{
  data: Array<{
    name: string;
    values: Array<{ value: number }>;
  }>;
}> {
  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_engaged_users',
    'post_clicks',
    'post_reactions_like_total',
    'post_reactions_love_total',
  ];

  let url = `${FACEBOOK_GRAPH_BASE}/${postId}/insights?metric=${metrics.join(',')}&access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch post insights');
  }

  return response.json();
}

/**
 * Get Page insights (analytics)
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function getPageInsights(
  pageId: string,
  pageAccessToken: string,
  since: string,
  until: string,
  appSecretProof?: string
): Promise<{
  data: Array<{
    name: string;
    values: Array<{ value: number; end_time: string }>;
  }>;
}> {
  const metrics = [
    'page_impressions',
    'page_impressions_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_fans',
  ];

  let url = `${FACEBOOK_GRAPH_BASE}/${pageId}/insights?metric=${metrics.join(',')}&since=${since}&until=${until}&access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch page insights');
  }

  return response.json();
}

/**
 * Upload video to Facebook Page
 * Uses graph-video.facebook.com for video uploads
 * Fetches video from URL and uploads binary data directly
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function uploadVideoToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  videoUrl: string,
  description: string,
  appSecretProof?: string
): Promise<{ id: string }> {

  // Fetch video from URL
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
  }
  
  const videoBlob = await videoResponse.blob();
  const fileSize = videoBlob.size;

  // Create FormData for multipart upload
  const formData = new FormData();
  formData.append('access_token', pageAccessToken);
  formData.append('description', description);
  formData.append('source', videoBlob, 'video.mp4');
  
  if (appSecretProof) {
    formData.append('appsecret_proof', appSecretProof);
  }

  // Use graph-video.facebook.com for video uploads
  const response = await fetch(
    `https://graph-video.facebook.com/v24.0/${pageId}/videos`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload video');
  }

  const result = await response.json();
  return result;
}

/**
 * Delete post
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function deletePost(
  postId: string,
  pageAccessToken: string,
  appSecretProof?: string
): Promise<{ success: boolean }> {
  let url = `${FACEBOOK_GRAPH_BASE}/${postId}?access_token=${pageAccessToken}`
  if (appSecretProof) {
    url += `&appsecret_proof=${appSecretProof}`
  }

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete post');
  }

  return response.json();
}

/**
 * Upload Facebook Reel
 * Facebook Reels are short-form vertical videos (9:16 aspect ratio)
 * Uses 3-step process: START -> UPLOAD (to rupload.facebook.com) -> FINISH
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function uploadFacebookReel(
  pageId: string,
  pageAccessToken: string,
  videoUrl: string,
  description: string,
  appSecretProof?: string
): Promise<{ id: string; video_id?: string }> {
  
  // Step 1: Initialize the upload session
  const initParams = new URLSearchParams({
    upload_phase: 'start',
    access_token: pageAccessToken,
  });

  if (appSecretProof) {
    initParams.append('appsecret_proof', appSecretProof);
  }

  const initResponse = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/video_reels`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: initParams.toString(),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(error.error?.message || 'Failed to initialize Reel upload');
  }

  const initData = await initResponse.json();
  const videoId = initData.video_id;

  // Step 2: Fetch video from URL and upload to Facebook's rupload server
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
  }
  
  const videoBuffer = await videoResponse.arrayBuffer();
  const fileSize = videoBuffer.byteLength;

  // Upload to rupload.facebook.com
  const uploadResponse = await fetch(
    `https://rupload.facebook.com/video-upload/v24.0/${videoId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${pageAccessToken}`,
        'offset': '0',
        'file_size': fileSize.toString(),
        'Content-Type': 'application/octet-stream',
      },
      body: videoBuffer,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload video: ${errorText}`);
  }

  const uploadData = await uploadResponse.json();

  // Step 3: Finish and publish the Reel
  const finishParams = new URLSearchParams({
    upload_phase: 'finish',
    video_id: videoId,
    video_state: 'PUBLISHED',
    description: description,
    access_token: pageAccessToken,
  });

  if (appSecretProof) {
    finishParams.append('appsecret_proof', appSecretProof);
  }

  const finishResponse = await fetch(
    `${FACEBOOK_GRAPH_BASE}/${pageId}/video_reels`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: finishParams.toString(),
    }
  );

  if (!finishResponse.ok) {
    const error = await finishResponse.json();
    throw new Error(error.error?.message || 'Failed to publish Reel');
  }

  const finishData = await finishResponse.json();
  return { id: finishData.id || videoId, video_id: videoId };
}

/**
 * Upload Facebook Story
 * Facebook Stories are temporary posts that disappear after 24 hours
 * For videos, fetches from URL and uploads binary data
 * @param appSecretProof Optional app secret proof for server-to-server calls
 */
export async function uploadFacebookStory(
  pageId: string,
  pageAccessToken: string,
  mediaUrl: string,
  isVideo: boolean = false,
  appSecretProof?: string
): Promise<{ id: string; post_id?: string }> {

  if (isVideo) {
    // For video stories, fetch and upload binary data
    const videoResponse = await fetch(mediaUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
    }
    
    const videoBlob = await videoResponse.blob();

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('access_token', pageAccessToken);
    formData.append('source', videoBlob, 'video.mp4');
    
    if (appSecretProof) {
      formData.append('appsecret_proof', appSecretProof);
    }

    const response = await fetch(
      `https://graph-video.facebook.com/v24.0/${pageId}/stories`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload Story');
    }

    const result = await response.json();
    return result;
  } else {
    // For photo stories, URL-based upload still works
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      photo_url: mediaUrl,
    });

    if (appSecretProof) {
      params.append('appsecret_proof', appSecretProof);
    }

    const response = await fetch(
      `${FACEBOOK_GRAPH_BASE}/${pageId}/stories`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload Story');
    }

    const result = await response.json();
    return result;
  }
}
