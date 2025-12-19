/**
 * Comment Reply Tools
 * Tools for posting replies to comments via Graph API
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { createHmac } from 'crypto';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface ReplyToolContext {
  accessToken: string;
}

/**
 * Generate appsecret_proof for Meta API server-to-server calls
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
 * Create tools for replying to comments
 */
export function createReplyTools(context: ReplyToolContext) {

  /**
   * Reply to a comment on Instagram or Facebook
   */
  const replyToComment = tool(
    async ({ commentId, message, platform }) => {
      try {

        const url = `${GRAPH_API_BASE}/${commentId}/replies`;
        const proof = generateAppSecretProof(context.accessToken);

        const params = new URLSearchParams({
          message,
          access_token: context.accessToken,
        });
        if (proof) {
          params.append('appsecret_proof', proof);
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });

        if (!response.ok) {
          const error = await response.json();
          return JSON.stringify({
            success: false,
            error: error.error?.message || 'Failed to post reply',
          });
        }

        const data = await response.json();

        return JSON.stringify({
          success: true,
          replyId: data.id,
          message: 'Reply posted successfully',
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    {
      name: 'reply_to_comment',
      description: 'Post a reply to a comment on Instagram or Facebook. Use this after finding relevant knowledge or generating an appropriate response.',
      schema: z.object({
        commentId: z.string().describe('The ID of the comment to reply to'),
        message: z.string().describe('The reply message to post. Keep it friendly, helpful, and concise (1-3 sentences).'),
        platform: z.enum(['instagram', 'facebook']).describe('The platform'),
      }),
    }
  );

  /**
   * Like a comment (for positive comments that don't need a reply)
   */
  const likeComment = tool(
    async ({ commentId }) => {
      try {
        const url = `${GRAPH_API_BASE}/${commentId}/likes`;
        const proof = generateAppSecretProof(context.accessToken);

        const params = new URLSearchParams({
          access_token: context.accessToken,
        });
        if (proof) {
          params.append('appsecret_proof', proof);
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });

        if (!response.ok) {
          return JSON.stringify({ success: false, error: 'Failed to like comment' });
        }

        return JSON.stringify({ success: true, message: 'Comment liked' });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    {
      name: 'like_comment',
      description: 'Like a comment to acknowledge it without replying. Use for positive comments that dont need a text response.',
      schema: z.object({
        commentId: z.string().describe('The ID of the comment to like'),
      }),
    }
  );

  return [replyToComment, likeComment];
}
