/**
 * Comment Fetch Tools
 * Tools for fetching comments from Instagram/Facebook via Graph API
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { createHmac } from 'crypto';
import { RawComment, CommentPlatform } from '../types/comment.types';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface FetchToolContext {
  accessToken: string;
  instagramUserId?: string;
  facebookPageId?: string;
}

/**
 * Generate appsecret_proof for Meta API server-to-server calls
 * Required by Facebook/Instagram Graph API for security
 */
function generateAppSecretProof(accessToken: string): string {
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.META_APP_SECRET || '';
  if (!appSecret) {
    return '';
  }
  return createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
}

/**
 * Build URL with access token and appsecret_proof
 */
function buildApiUrl(baseUrl: string, accessToken: string): string {
  const proof = generateAppSecretProof(accessToken);
  let url = `${baseUrl}&access_token=${accessToken}`;
  if (proof) {
    url += `&appsecret_proof=${proof}`;
  }
  return url;
}

/**
 * Debug token permissions (useful for troubleshooting)
 */
async function debugTokenPermissions(accessToken: string): Promise<string[]> {
  try {
    const proof = generateAppSecretProof(accessToken);
    let url = `${GRAPH_API_BASE}/me/permissions?access_token=${accessToken}`;
    if (proof) url += `&appsecret_proof=${proof}`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const granted = (data.data || [])
      .filter((p: any) => p.status === 'granted')
      .map((p: any) => p.permission);
    
    return granted;
  } catch {
    return [];
  }
}

/**
 * Create tools for fetching comments from social platforms
 */
export function createFetchTools(context: FetchToolContext) {
  

  /**
   * Fetch recent posts that have comments
   */
  const fetchRecentPosts = tool(
    async ({ platform, limit }) => {
      try {
        const userId = platform === 'instagram' 
          ? context.instagramUserId 
          : context.facebookPageId;


        if (!userId) {
          return JSON.stringify({
            success: false,
            error: `No ${platform} account connected. Please connect your ${platform} account in Settings.`,
            posts: [],
          });
        }

        // Different endpoints and fields for each platform
        // Instagram: Use /{ig-user-id}/media endpoint
        // Facebook: Use /{page-id}/posts (NOT /feed - /feed requires more permissions)
        // /posts returns only page's own posts and works with pages_manage_posts permission
        const endpoint = platform === 'instagram' ? 'media' : 'posts';
        const fields = platform === 'instagram'
          ? 'id,caption,timestamp,comments_count,like_count,media_type,permalink'
          : 'id,message,created_time,comments.summary(true),shares,permalink_url';

        const url = buildApiUrl(
          `${GRAPH_API_BASE}/${userId}/${endpoint}?fields=${fields}&limit=${limit}`,
          context.accessToken
        );


        const response = await fetch(url);

        if (!response.ok) {
          const error = await response.json();
          
          // Check for permission errors and provide actionable guidance
          const errorCode = error.error?.code;
          const errorMessage = error.error?.message || `Failed to fetch ${platform} posts`;
          
          // Debug token permissions on error
          if (errorCode === 10 || errorCode === 190) {
            const permissions = await debugTokenPermissions(context.accessToken);
            const hasPageReadEngagement = permissions.includes('pages_read_engagement');
            const hasPageManagePosts = permissions.includes('pages_manage_posts');
          }
          
          let userMessage = errorMessage;
          if (errorCode === 10 || errorMessage.includes('pages_read_engagement')) {
            // Error code 10 = Permission denied
            // This happens when pages_read_engagement is not approved via App Review
            // Instagram works because instagram_basic doesn't require App Review
            userMessage = `Facebook permission denied (Error #10): The 'pages_read_engagement' permission requires Facebook App Review approval. ` +
              `Instagram works because it uses different permissions that don't require App Review. ` +
              `To fix: Go to Facebook Developer Console → App Review → Request 'pages_read_engagement' permission, ` +
              `OR add yourself as a test user in App Roles and ensure you're an admin of the Facebook Page.`;
          } else if (errorCode === 190) {
            userMessage = `Access token expired. Please reconnect your ${platform} account in Settings.`;
          }
          
          return JSON.stringify({
            success: false,
            error: userMessage,
            errorCode,
            posts: [],
          });
        }

        const data = await response.json();

        const posts = (data.data || []).map((p: any) => {
          // Instagram uses comments_count, Facebook uses comments.summary.total_count
          const commentsCount = platform === 'instagram' 
            ? (p.comments_count || 0)
            : (p.comments?.summary?.total_count || 0);
          
          return {
            id: p.id,
            caption: p.caption || p.message || '',
            timestamp: p.timestamp || p.created_time,
            commentsCount,
            permalink: p.permalink || p.permalink_url,
            platform,
          };
        });

        // Filter to posts that have comments
        const postsWithComments = posts.filter((p: any) => p.commentsCount > 0);


        return JSON.stringify({
          success: true,
          posts: postsWithComments,
          count: postsWithComments.length,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          posts: [],
        });
      }
    },
    {
      name: 'fetch_recent_posts',
      description: 'Fetch recent posts from Instagram or Facebook that have comments to process.',
      schema: z.object({
        platform: z.enum(['instagram', 'facebook']).describe('The platform to fetch from'),
        limit: z.number().default(10).describe('Maximum number of posts to fetch'),
      }),
    }
  );

  /**
   * Fetch comments for a specific post
   * Also checks if we already replied to each comment
   */
  const fetchCommentsForPost = tool(
    async ({ postId, platform, limit }) => {
      try {
        // Fetch comments with replies to check if we already responded
        const fields = 'id,text,from,timestamp,like_count,replies{from,message}';
        const url = buildApiUrl(
          `${GRAPH_API_BASE}/${postId}/comments?fields=${fields}&limit=${limit}`,
          context.accessToken
        );

        const response = await fetch(url);

        if (!response.ok) {
          const error = await response.json();
          
          const errorCode = error.error?.code;
          const errorMessage = error.error?.message || 'Failed to fetch comments';
          
          let userMessage = errorMessage;
          if (errorCode === 10 || errorMessage.includes('pages_read_engagement')) {
            userMessage = `Permission denied: Please reconnect your Facebook account in Settings to grant the required permissions.`;
          } else if (errorCode === 190) {
            userMessage = `Access token expired. Please reconnect your account in Settings.`;
          }
          
          return JSON.stringify({
            success: false,
            error: userMessage,
            errorCode,
            comments: [],
          });
        }

        const data = await response.json();

        // Get our account ID to check for existing replies
        const ourAccountId = platform === 'instagram' 
          ? context.instagramUserId 
          : context.facebookPageId;

        const comments: RawComment[] = (data.data || []).map((c: any) => {
          // Check if any reply is from our account
          const hasOurReply = c.replies?.data?.some(
            (reply: any) => reply.from?.id === ourAccountId
          );

          return {
            id: c.id,
            text: c.text || c.message || '',
            username: c.from?.username || c.from?.name || 'Unknown',
            timestamp: c.timestamp,
            likeCount: c.like_count || 0,
            postId,
            platform,
            hasReply: hasOurReply,
          };
        });

        // Filter out comments we already replied to
        const unansweredComments = comments.filter(c => !c.hasReply);


        return JSON.stringify({
          success: true,
          comments: unansweredComments,
          total: comments.length,
          unanswered: unansweredComments.length,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          comments: [],
        });
      }
    },
    {
      name: 'fetch_comments_for_post',
      description: 'Fetch comments for a specific post. Automatically filters out comments we already replied to.',
      schema: z.object({
        postId: z.string().describe('The post/media ID to fetch comments for'),
        platform: z.enum(['instagram', 'facebook']).describe('The platform'),
        limit: z.number().default(50).describe('Maximum number of comments to fetch'),
      }),
    }
  );

  return [fetchRecentPosts, fetchCommentsForPost];
}
