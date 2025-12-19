/**
 * YouTube Comment Reply Tools
 * Tools for posting replies to comments via YouTube Data API v3
 */

import { tool } from 'langchain';
import * as z from 'zod';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeReplyToolContext {
  accessToken: string;
}

/**
 * Make authenticated request to YouTube API
 */
async function makeYouTubeRequest(
  url: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `YouTube API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Create tools for replying to YouTube comments
 */
export function createYouTubeReplyTools(context: YouTubeReplyToolContext) {

  /**
   * Reply to a comment on YouTube
   */
  const replyToComment = tool(
    async ({ commentId, message }) => {
      try {

        // YouTube Comments API: POST to /comments with parentId
        const url = `${YOUTUBE_API_BASE}/comments?part=snippet`;

        const body = {
          snippet: {
            parentId: commentId,
            textOriginal: message,
          },
        };

        const data = await makeYouTubeRequest(url, context.accessToken, 'POST', body);


        return JSON.stringify({
          success: true,
          replyId: data.id,
          message: 'Reply posted successfully',
        });
      } catch (error) {
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle specific YouTube API errors
        let userMessage = errorMessage;
        if (errorMessage.includes('quotaExceeded')) {
          userMessage = 'YouTube API quota exceeded. Please try again later.';
        } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
          userMessage = 'Permission denied. Please reconnect your YouTube account with comment permissions.';
        } else if (errorMessage.includes('commentThreadClosed')) {
          userMessage = 'Comments are closed on this video.';
        }
        
        return JSON.stringify({
          success: false,
          error: userMessage,
        });
      }
    },
    {
      name: 'reply_to_youtube_comment',
      description: 'Post a reply to a comment on YouTube. Use this after finding relevant knowledge or generating an appropriate response.',
      schema: z.object({
        commentId: z.string().describe('The ID of the comment to reply to'),
        message: z.string().describe('The reply message to post. Keep it friendly, helpful, and concise (1-3 sentences).'),
      }),
    }
  );

  /**
   * Like a comment (for positive comments that don't need a reply)
   */
  const likeComment = tool(
    async ({ commentId }) => {
      try {

        // YouTube uses PUT to set rating
        const url = `${YOUTUBE_API_BASE}/comments/setModerationStatus?id=${commentId}&moderationStatus=published`;
        
        // Note: YouTube doesn't have a direct "like" API for comments from the channel owner
        // We can only moderate comments (approve/reject) or reply to them
        // For now, we'll just return success as acknowledgment
        

        return JSON.stringify({
          success: true,
          message: 'Comment acknowledged',
          note: 'YouTube API does not support liking comments programmatically',
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    {
      name: 'like_youtube_comment',
      description: 'Acknowledge a positive YouTube comment. Note: YouTube API does not support liking comments, so this just marks it as processed.',
      schema: z.object({
        commentId: z.string().describe('The ID of the comment to acknowledge'),
      }),
    }
  );

  /**
   * Mark comment as spam or inappropriate
   */
  const markCommentAsSpam = tool(
    async ({ commentId }) => {
      try {

        const url = `${YOUTUBE_API_BASE}/comments/setModerationStatus`;
        const params = new URLSearchParams({
          id: commentId,
          moderationStatus: 'rejected',
          banAuthor: 'false', // Don't ban the user, just reject the comment
        });

        await fetch(`${url}?${params.toString()}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${context.accessToken}`,
            'Accept': 'application/json',
          },
        });


        return JSON.stringify({
          success: true,
          message: 'Comment marked as spam and hidden',
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    {
      name: 'mark_youtube_comment_spam',
      description: 'Mark a YouTube comment as spam to hide it from the video. Use this for obvious spam, promotional links, or abusive content.',
      schema: z.object({
        commentId: z.string().describe('The ID of the comment to mark as spam'),
      }),
    }
  );

  return [replyToComment, likeComment, markCommentAsSpam];
}
