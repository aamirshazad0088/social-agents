/**
 * TikTok OAuth Client Library
 * Handles OAuth 2.0 authentication and API interactions with TikTok
 */

// TikTok API v2 Endpoints (2025)
const TIKTOK_OAUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const TIKTOK_VIDEO_PUBLISH_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TikTokUserInfo {
  data: {
    user: {
      open_id: string;
      union_id?: string;
      display_name: string;
      avatar_url?: string;
    };
  };
}

interface TikTokVideoUploadResponse {
  data: {
    publish_id: string;
    upload_url?: string; // Only present for FILE_UPLOAD source
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export class TikTokClient {
  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientKey: string, clientSecret: string, redirectUri: string) {
    this.clientKey = clientKey;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.upload,video.publish',
      redirect_uri: this.redirectUri,
      state: state,
    });

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${TIKTOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier?: string
  ): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TikTok token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TikTok token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Get user profile information (v2 API)
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const params = new URLSearchParams({
      fields: 'open_id,union_id,display_name,avatar_url',
    });

    const response = await fetch(`${TIKTOK_USER_INFO_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch TikTok user info: ${error.error?.message || error.error}`);
    }

    return response.json();
  }

  /**
   * Initialize video publish (v2 API)
   * Supports both FILE_UPLOAD and PULL_FROM_URL
   */
  async initVideoPublish(
    accessToken: string,
    videoData: {
      title: string;
      videoUrl?: string; // For PULL_FROM_URL
      videoSize?: number; // For FILE_UPLOAD
      privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    }
  ): Promise<TikTokVideoUploadResponse> {
    const body: any = {
      post_info: {
        title: videoData.title,
        privacy_level: videoData.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: videoData.videoUrl
        ? {
            source: 'PULL_FROM_URL',
            video_url: videoData.videoUrl,
          }
        : {
            source: 'FILE_UPLOAD',
            video_size: videoData.videoSize,
            chunk_size: Math.min(videoData.videoSize || 10000000, 10000000), // Max 10MB chunks
            total_chunk_count: Math.ceil((videoData.videoSize || 0) / 10000000),
          },
    };

    const response = await fetch(TIKTOK_VIDEO_PUBLISH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();

    if (!response.ok || (payload.error && payload.error.code && payload.error.code !== 'ok')) {
      const code = payload.error?.code;
      const logId = payload.error?.log_id;
      const message = payload.error?.message || JSON.stringify(payload);


      throw new Error(
        `Failed to init TikTok video publish: code=${code || 'unknown'} log=${logId || 'n/a'} message=${message}`
      );
    }

    return payload;
  }

  /**
   * Check publish status
   */
  async checkPublishStatus(
    accessToken: string,
    publishId: string
  ): Promise<{ status: string; publish_id: string }> {
    const statusUrl = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

    const response = await fetch(statusUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to check publish status: ${error.error?.message || JSON.stringify(error)}`
      );
    }

    return response.json();
  }
}

/**
 * Create TikTok client instance
 */
export function createTikTokClient(
  clientKey: string,
  clientSecret: string,
  redirectUri: string
): TikTokClient {
  return new TikTokClient(clientKey, clientSecret, redirectUri);
}
