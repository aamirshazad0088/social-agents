/**
 * LinkedIn API Client Utility
 * Handles LinkedIn OAuth 2.0 and API v2 integration
 * 
 * OPTIMIZATION: Carousel image uploads now use concurrent processing
 * with a configurable concurrency limit (default: 5 parallel uploads)
 */

/**
 * Simple concurrency limiter for parallel operations
 * Limits the number of concurrent promises to avoid overwhelming the API
 */
function createConcurrencyLimiter(concurrency: number) {
  const queue: (() => void)[] = []
  let activeCount = 0

  const next = () => {
    activeCount--
    if (queue.length > 0) {
      queue.shift()!()
    }
  }

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    activeCount++
    try {
      return await fn()
    } finally {
      next()
    }
  }
}

/**
 * LinkedIn OAuth 2.0 URLs
 */
export const LINKEDIN_OAUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
export const LINKEDIN_REST_API = 'https://api.linkedin.com/rest';
export const LINKEDIN_API_VERSION = '202411'; // YYYYMM format

/**
 * Required OAuth scopes for LinkedIn (OpenID Connect)
 *
 * IMPORTANT: LinkedIn has migrated to OpenID Connect (OIDC)
 * Scopes available depend on which products are enabled in your LinkedIn Developer Portal
 *
 * Basic scopes (always use these):
 * - openid: Required for OpenID Connect
 * - profile: User profile information
 * - email: User email address
 *
 * Optional scopes (only use if product is enabled):
 * - w_member_social: Allows posting to LinkedIn (requires "Share on LinkedIn" product enabled)
 * - w_organization_social: Allows posting to company pages (requires "Advertising API" or "Marketing Developer Platform")
 * - r_organization_social: Read organization posts
 *
 * If you get "invalid_scope_error", it means a scope is not authorized:
 * 1. Remove the problematic scope from this array, OR
 * 2. Enable the corresponding product in LinkedIn Developer Portal
 *
 * For posting capability, you must:
 * 1. Enable "Share on LinkedIn" product in Developer Portal
 * 2. Then add 'w_member_social' to this array
 * 
 * For company page posting:
 * 1. Enable "Advertising API" or "Marketing Developer Platform" product
 * 2. Add 'w_organization_social' scope
 */
export const LINKEDIN_SCOPES = [
  'openid',           // Required for OpenID Connect
  'profile',          // Get user profile info
  'email',            // Get user email
  'w_member_social',  // Posting to LinkedIn (requires "Share on LinkedIn" product)
  'w_organization_social', // Posting to company pages (requires Marketing API product)
];

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function generateLinkedInAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: LINKEDIN_SCOPES.join(' '),
  });

  return `${LINKEDIN_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get LinkedIn user profile via OpenID Connect userinfo endpoint
 * This is the recommended endpoint for new LinkedIn apps using OpenID Connect
 *
 * Response includes:
 * - sub: User identifier (format: ACoAA...)
 * - name: Full name
 * - given_name: First name
 * - family_name: Last name
 * - picture: Profile picture URL
 * - email: Email address
 */
export async function getLinkedInProfile(accessToken: string): Promise<{
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
}> {
  const response = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch LinkedIn profile: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get LinkedIn user's URN (Uniform Resource Name)
 */
export async function getLinkedInUserUrn(accessToken: string): Promise<string> {
  const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'LinkedIn-Version': '202402',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn user URN');
  }

  const data = await response.json();
  return data.id; // Returns the user's URN
}

/**
 * Get LinkedIn organization pages that the user administers
 * Returns list of organizations the user can post to
 * 
 * Documentation: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/organization-access-control
 */
export async function getLinkedInOrganizations(accessToken: string): Promise<{
  id: string;
  name: string;
  vanityName?: string;
}[]> {
  try {
    // First, get the organization access control list
    const response = await fetch(
      `${LINKEDIN_REST_API}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName)))`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': LINKEDIN_API_VERSION,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return [];
    }

    const data = await response.json();

    const organizations: { id: string; name: string; vanityName?: string }[] = [];

    if (data.elements && Array.isArray(data.elements)) {
      for (const element of data.elements) {
        // Extract organization URN from the element
        const orgUrn = element.organization;
        if (orgUrn) {
          // Extract organization ID from URN (urn:li:organization:12345 -> 12345)
          const orgId = orgUrn.replace('urn:li:organization:', '');
          const orgDetails = element['organization~'];
          
          organizations.push({
            id: orgId,
            name: orgDetails?.localizedName || `Organization ${orgId}`,
            vanityName: orgDetails?.vanityName,
          });
        }
      }
    }

    return organizations;
  } catch (error) {
    return [];
  }
}

/**
 * Post to LinkedIn using the new Posts API
 * Documentation: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 * 
 * Note: The ugcPosts API is deprecated. This uses the new /rest/posts endpoint.
 * 
 * @param accessToken - LinkedIn access token
 * @param authorUrn - Author URN (can be person or organization)
 * @param text - Post text content
 * @param visibility - Post visibility (PUBLIC or CONNECTIONS)
 * @param mediaUrn - Optional media URN (image or video)
 * @param isOrganization - If true, treat authorUrn as organization ID
 */
export async function postToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string,
  visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC',
  mediaUrn?: string,
  isOrganization: boolean = false
): Promise<{ id: string }> {
  // Ensure author URN is in correct format
  let formattedAuthorUrn: string;
  
  if (isOrganization) {
    // For organization/company page posts
    formattedAuthorUrn = authorUrn.startsWith('urn:li:organization:')
      ? authorUrn
      : `urn:li:organization:${authorUrn}`;
  } else {
    // For personal profile posts
    formattedAuthorUrn = authorUrn.startsWith('urn:li:person:')
      ? authorUrn
      : `urn:li:person:${authorUrn}`;
  }

  // Build the post body using new Posts API format
  const postBody: any = {
    author: formattedAuthorUrn,
    commentary: text,
    visibility: visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  // Add media if provided (image or video)
  if (mediaUrn) {
    // Check if it's a video URN - videos require a title field
    const isVideo = mediaUrn.startsWith('urn:li:video:');
    postBody.content = {
      media: {
        id: mediaUrn,
        ...(isVideo && { title: text.substring(0, 100) || 'Video Post' }) // LinkedIn requires title for videos
      }
    };
  }


  const response = await fetch(`${LINKEDIN_REST_API}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post to LinkedIn: ${errorText}`);
  }

  // Post ID is returned in the x-restli-id header
  const postId = response.headers.get('x-restli-id') || '';

  return { id: postId };
}

/**
 * Initialize image upload to LinkedIn using the new Images API
 * Documentation: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
 * 
 * Returns urn:li:image:{id} for use in Posts API
 * 
 * @param accessToken - LinkedIn access token
 * @param authorUrn - Author URN (person ID or organization ID)
 * @param isOrganization - If true, treat authorUrn as organization ID
 */
export async function initializeImageUpload(
  accessToken: string,
  authorUrn: string,
  isOrganization: boolean = false
): Promise<{
  uploadUrl: string;
  asset: string;
}> {
  // Format owner URN correctly based on type
  let ownerUrn: string;
  if (isOrganization) {
    ownerUrn = authorUrn.startsWith('urn:li:organization:')
      ? authorUrn
      : `urn:li:organization:${authorUrn}`;
  } else {
    ownerUrn = authorUrn.startsWith('urn:li:person:')
      ? authorUrn
      : `urn:li:person:${authorUrn}`;
  }

  const requestBody = {
    initializeUploadRequest: {
      owner: ownerUrn,
    },
  };


  const response = await fetch(`${LINKEDIN_REST_API}/images?action=initializeUpload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize image upload: ${error}`);
  }

  const data = await response.json();
  
  return {
    uploadUrl: data.value.uploadUrl,
    asset: data.value.image, // Returns urn:li:image:{id}
  };
}

/**
 * Upload image binary to LinkedIn
 * The upload URL is obtained from initializeImageUpload
 */
export async function uploadImageBinary(
  uploadUrl: string,
  imageBuffer: Buffer | Uint8Array,
  accessToken: string
): Promise<void> {
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(imageBuffer instanceof ArrayBuffer ? imageBuffer : imageBuffer.buffer) as BodyInit,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload image binary to LinkedIn: ${error}`);
  }
  
}

/**
 * Initialize video upload to LinkedIn using the new Videos API
 * Documentation: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
 * 
 * Returns urn:li:video:{id} for use in Posts API
 * 
 * @param accessToken - LinkedIn access token
 * @param authorUrn - Author URN (person ID or organization ID)
 * @param fileSizeBytes - Size of video file in bytes
 * @param isOrganization - If true, treat authorUrn as organization ID
 */
export async function initializeVideoUpload(
  accessToken: string,
  authorUrn: string,
  fileSizeBytes: number,
  isOrganization: boolean = false
): Promise<{
  uploadUrl: string;
  asset: string;
}> {
  // Format owner URN correctly based on type
  let ownerUrn: string;
  if (isOrganization) {
    ownerUrn = authorUrn.startsWith('urn:li:organization:')
      ? authorUrn
      : `urn:li:organization:${authorUrn}`;
  } else {
    ownerUrn = authorUrn.startsWith('urn:li:person:')
      ? authorUrn
      : `urn:li:person:${authorUrn}`;
  }

  const requestBody = {
    initializeUploadRequest: {
      owner: ownerUrn,
      fileSizeBytes: fileSizeBytes,
      uploadCaptions: false,
      uploadThumbnail: false,
    },
  };


  const response = await fetch(`${LINKEDIN_REST_API}/videos?action=initializeUpload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to initialize video upload: ${error}`);
  }

  const data = await response.json();
  
  // For videos, LinkedIn returns uploadInstructions with uploadUrl
  const uploadUrl = data.value.uploadInstructions?.[0]?.uploadUrl || data.value.uploadUrl;
  
  return {
    uploadUrl: uploadUrl,
    asset: data.value.video, // Returns urn:li:video:{id}
  };
}

/**
 * Upload video binary to LinkedIn
 * The upload URL is obtained from initializeVideoUpload
 * Returns the ETag from the response header for finalization
 */
export async function uploadVideoBinary(
  uploadUrl: string,
  videoBuffer: Buffer | Uint8Array,
  accessToken: string
): Promise<string> {
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(videoBuffer instanceof ArrayBuffer ? videoBuffer : videoBuffer.buffer) as BodyInit,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload video binary to LinkedIn: ${error}`);
  }
  
  // Get ETag from response headers - required for finalization
  const etag = response.headers.get('etag') || '';
  
  return etag;
}

/**
 * Finalize video upload after binary upload is complete
 * Required for the new Videos API
 * 
 * @param accessToken - LinkedIn access token
 * @param videoUrn - The video URN from initializeUpload
 * @param uploadedPartIds - Array of ETags from the upload responses
 */
export async function finalizeVideoUpload(
  accessToken: string,
  videoUrn: string,
  uploadedPartIds: string[]
): Promise<void> {
  const requestBody = {
    finalizeUploadRequest: {
      video: videoUrn,
      uploadToken: '',
      uploadedPartIds: uploadedPartIds,
    },
  };


  const response = await fetch(`${LINKEDIN_REST_API}/videos?action=finalizeUpload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to finalize video upload: ${error}`);
  }
  
}

/**
 * Post a carousel (MultiImage) to LinkedIn
 * Documentation: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/multiimage-post-api
 * 
 * Requires 2-20 images, each uploaded via Images API first
 * 
 * @param accessToken - LinkedIn access token
 * @param authorUrn - Author URN (person ID or organization ID)
 * @param text - Post text content
 * @param imageUrns - Array of urn:li:image:{id}
 * @param visibility - Post visibility
 * @param isOrganization - If true, treat authorUrn as organization ID
 */
export async function postCarouselToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageUrns: string[], // Array of urn:li:image:{id}
  visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC',
  isOrganization: boolean = false
): Promise<{ id: string }> {
  if (imageUrns.length < 2) {
    throw new Error('LinkedIn carousel requires at least 2 images');
  }
  if (imageUrns.length > 20) {
    throw new Error('LinkedIn carousel supports maximum 20 images');
  }

  // Format author URN correctly based on type
  let formattedAuthorUrn: string;
  if (isOrganization) {
    formattedAuthorUrn = authorUrn.startsWith('urn:li:organization:')
      ? authorUrn
      : `urn:li:organization:${authorUrn}`;
  } else {
    formattedAuthorUrn = authorUrn.startsWith('urn:li:person:')
      ? authorUrn
      : `urn:li:person:${authorUrn}`;
  }

  // Build multiImage content
  const images = imageUrns.map((urn, index) => ({
    id: urn,
    altText: `Slide ${index + 1}`,
  }));

  const postBody = {
    author: formattedAuthorUrn,
    commentary: text,
    visibility: visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    content: {
      multiImage: {
        images: images
      }
    }
  };


  const response = await fetch(`${LINKEDIN_REST_API}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post carousel to LinkedIn: ${errorText}`);
  }

  const postId = response.headers.get('x-restli-id') || '';

  return { id: postId };
}

/**
 * Upload a single image to LinkedIn
 * Helper function for concurrent uploads
 */
async function uploadSingleImage(
  buffer: Buffer | Uint8Array,
  accessToken: string,
  authorUrn: string,
  isOrganization: boolean = false
): Promise<string> {
  const { uploadUrl, asset } = await initializeImageUpload(accessToken, authorUrn, isOrganization)
  await uploadImageBinary(uploadUrl, buffer, accessToken)
  return asset
}

/**
 * Upload multiple images and create a carousel post
 * Helper function that combines image uploads + carousel post
 * 
 * OPTIMIZATION: Uses concurrent uploads with a limit of 5 parallel requests
 * This reduces upload time from O(n) sequential to O(n/5) parallel
 * Example: 20 images at 1s each = 20s sequential vs ~4s parallel
 * 
 * @param accessToken - LinkedIn access token
 * @param authorUrn - Author URN (person ID or organization ID)
 * @param text - Post text content
 * @param imageBuffers - Array of image buffers to upload
 * @param visibility - Post visibility (PUBLIC or CONNECTIONS)
 * @param isOrganization - If true, treat authorUrn as organization ID
 * @param concurrency - Max concurrent uploads (default: 5, max recommended: 10)
 */
export async function uploadAndPostCarousel(
  accessToken: string,
  authorUrn: string,
  text: string,
  imageBuffers: (Buffer | Uint8Array)[],
  visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC',
  isOrganization: boolean = false,
  concurrency: number = 5
): Promise<{ id: string; imageUrns: string[] }> {
  if (imageBuffers.length < 2) {
    throw new Error('LinkedIn carousel requires at least 2 images')
  }
  if (imageBuffers.length > 20) {
    throw new Error('LinkedIn carousel supports maximum 20 images')
  }

  // Create concurrency limiter to avoid overwhelming LinkedIn API
  const limit = createConcurrencyLimiter(Math.min(concurrency, 10))

  // Upload all images concurrently with rate limiting
  // Use Promise.all with concurrency control for parallel uploads
  const uploadPromises = imageBuffers.map((buffer, index) =>
    limit(async () => {
      const asset = await uploadSingleImage(buffer, accessToken, authorUrn, isOrganization)
      return { index, asset }
    })
  )

  const results = await Promise.all(uploadPromises)
  
  // Sort by original index to maintain order
  results.sort((a, b) => a.index - b.index)
  const imageUrns = results.map(r => r.asset)

  // Create carousel post
  const result = await postCarouselToLinkedIn(
    accessToken,
    authorUrn,
    text,
    imageUrns,
    visibility,
    isOrganization
  )

  return {
    id: result.id,
    imageUrns
  }
}

/**
 * Refresh LinkedIn access token
 */
export async function refreshLinkedInToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  return response.json();
}
