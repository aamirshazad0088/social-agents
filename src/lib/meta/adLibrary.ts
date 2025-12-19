/**
 * Meta Ad Library Utility
 * Handles uploading images and videos to Meta Ad Library
 * 
 * @see https://developers.facebook.com/docs/marketing-api/reference/ad-image
 * @see https://developers.facebook.com/docs/marketing-api/reference/ad-video
 */

import { META_API_BASE, generateAppSecretProof } from './apiUtils';

const META_API_VERSION = 'v24.0';

export interface AdImageUploadResult {
  hash: string;
  url: string;
  width?: number;
  height?: number;
}

export interface AdVideoUploadResult {
  id: string;
  video_id: string;
  status?: {
    video_status: 'ready' | 'processing' | 'error';
    processing_progress?: number;
  };
}

/**
 * Upload image to Meta Ad Library
 * Images can be uploaded via URL or binary data
 */
export async function uploadAdImage(
  accountId: string,
  accessToken: string,
  imageUrl: string,
  name?: string
): Promise<AdImageUploadResult> {
  const appSecretProof = generateAppSecretProof(accessToken);
  const params = new URLSearchParams({
    bytes: '', // Empty for URL-based upload
    url: imageUrl,
    access_token: accessToken,
    ...(appSecretProof && { appsecret_proof: appSecretProof }),
  });

  if (name) {
    params.append('name', name);
  }

  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/adimages`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload image to Ad Library');
  }

  const result = await response.json();
  // Meta returns format: { "images": { "hash": { "hash": "...", "url": "..." } } }
  const imageData = Object.values(result.images || {})[0] as any;
  
  return {
    hash: imageData.hash,
    url: imageData.url,
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Upload image binary data to Meta Ad Library
 * Note: Meta API requires base64 encoded bytes parameter for binary uploads
 */
export async function uploadAdImageBinary(
  accountId: string,
  accessToken: string,
  imageBuffer: Buffer,
  name?: string
): Promise<AdImageUploadResult> {
  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const appSecretProof = generateAppSecretProof(accessToken);
  
  const params = new URLSearchParams({
    bytes: base64Image,
    access_token: accessToken,
    ...(appSecretProof && { appsecret_proof: appSecretProof }),
  });

  if (name) {
    params.append('name', name);
  }

  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/adimages`,
    {
      method: 'POST',
      body: params,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload image to Ad Library');
  }

  const result = await response.json();
  const imageData = Object.values(result.images || {})[0] as any;
  
  return {
    hash: imageData.hash,
    url: imageData.url,
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Upload video to Meta Ad Library
 * Videos must be uploaded via URL (Meta doesn't support direct binary upload for videos)
 */
export async function uploadAdVideo(
  accountId: string,
  accessToken: string,
  videoUrl: string,
  name?: string,
  description?: string
): Promise<AdVideoUploadResult> {
  const appSecretProof = generateAppSecretProof(accessToken);
  
  // Step 1: Create video container
  const createParams = new URLSearchParams({
    upload_phase: 'start',
    access_token: accessToken,
    ...(appSecretProof && { appsecret_proof: appSecretProof }),
  });

  if (name) {
    createParams.append('name', name);
  }

  const createResponse = await fetch(
    `${META_API_BASE}/act_${accountId}/advideos`,
    {
      method: 'POST',
      body: createParams,
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.error?.message || 'Failed to create video container');
  }

  const createData = await createResponse.json();
  const videoId = createData.video_id;

  // Step 2: Upload video file
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error('Failed to fetch video from URL');
  }

  const videoBlob = await videoResponse.blob();
  const fileSize = videoBlob.size;

  // Upload to rupload.facebook.com
  const uploadResponse = await fetch(
    `https://rupload.facebook.com/video-upload/${META_API_VERSION}/${videoId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'offset': '0',
        'file_size': fileSize.toString(),
        'Content-Type': 'application/octet-stream',
      },
      body: videoBlob,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload video: ${errorText}`);
  }

  // Step 3: Finish upload
  const finishParams = new URLSearchParams({
    upload_phase: 'finish',
    video_id: videoId,
    access_token: accessToken,
    ...(appSecretProof && { appsecret_proof: appSecretProof }),
  });

  if (description) {
    finishParams.append('description', description);
  }

  const finishResponse = await fetch(
    `${META_API_BASE}/act_${accountId}/advideos`,
    {
      method: 'POST',
      body: finishParams,
    }
  );

  if (!finishResponse.ok) {
    const error = await finishResponse.json();
    throw new Error(error.error?.message || 'Failed to finish video upload');
  }

  const finishData = await finishResponse.json();

  return {
    id: finishData.id || videoId,
    video_id: videoId,
    status: finishData.status,
  };
}

/**
 * Get ad image by hash
 */
export async function getAdImage(
  accountId: string,
  accessToken: string,
  imageHash: string
): Promise<AdImageUploadResult> {
  const appSecretProof = generateAppSecretProof(accessToken);
  const authParams = `access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;
  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/adimages?hashes=[${imageHash}]&${authParams}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get ad image');
  }

  const result = await response.json();
  const imageData = result.data?.[0];
  
  return {
    hash: imageData.hash,
    url: imageData.url,
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Get ad video by ID
 */
export async function getAdVideo(
  accountId: string,
  accessToken: string,
  videoId: string
): Promise<AdVideoUploadResult> {
  const appSecretProof = generateAppSecretProof(accessToken);
  const authParams = `access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;
  const response = await fetch(
    `${META_API_BASE}/${videoId}?fields=id,video_id,status&${authParams}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get ad video');
  }

  const result = await response.json();
  
  return {
    id: result.id,
    video_id: result.video_id || videoId,
    status: result.status,
  };
}

