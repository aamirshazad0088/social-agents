/**
 * YouTube Comment Fetch Tools
 * Tools for fetching comments from YouTube via YouTube Data API v3
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { RawComment } from '../types/comment.types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeFetchToolContext {
  accessToken: string;
  channelId?: string;
}

/**
 * Build YouTube API URL with query parameters
 * Note: OAuth token is passed in Authorization header, not URL
 */
function buildYouTubeApiUrl(endpoint: string, params: Record<string, string>): string {
  const urlParams = new URLSearchParams(params);
  return `${YOUTUBE_API_BASE}/${endpoint}?${urlParams.toString()}`;
}

/**
 * Make authenticated request to YouTube API
 */
async function makeYouTubeRequest(url: string, accessToken: string): Promise<any> {
  if (!accessToken || accessToken.trim() === '') {
    throw new Error('YouTube access token is missing or empty');
  }


  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error?.message || `YouTube API error: ${response.status} ${response.statusText}`);
    } catch (e) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  return response.json();
}

/**
 * Get channel ID for the authenticated user
 */
async function getMyChannelId(accessToken: string): Promise<string | null> {
  try {
    const url = buildYouTubeApiUrl('channels', { part: 'id', mine: 'true' });
    const data = await makeYouTubeRequest(url, accessToken);
    
    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Create tools for fetching YouTube videos and comments
 */
export function createYouTubeFetchTools(context: YouTubeFetchToolContext) {
  

  /**
   * Fetch recent videos that have comments
   */
  const fetchRecentVideos = tool(
    async ({ limit }) => {
      try {

        // First, get channel ID if not provided
        let channelId = context.channelId;
        if (!channelId) {
          const fetchedChannelId = await getMyChannelId(context.accessToken);
          if (!fetchedChannelId) {
            return JSON.stringify({
              success: false,
              error: 'No YouTube channel found. Please ensure your account has a YouTube channel.',
              videos: [],
            });
          }
          channelId = fetchedChannelId;
        }

        // Fetch recent videos from the channel
        const searchUrl = buildYouTubeApiUrl(
          'search',
          {
            part: 'id,snippet',
            channelId: channelId,
            type: 'video',
            order: 'date',
            maxResults: limit.toString(),
          }
        );

        const searchData = await makeYouTubeRequest(searchUrl, context.accessToken);

        if (!searchData.items || searchData.items.length === 0) {
          return JSON.stringify({
            success: true,
            videos: [],
            count: 0,
            message: 'No videos found on your channel',
          });
        }

        // Get video IDs
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

        // Fetch video statistics including comment counts
        const statsUrl = buildYouTubeApiUrl(
          'videos',
          {
            part: 'statistics,snippet',
            id: videoIds,
          }
        );

        const statsData = await makeYouTubeRequest(statsUrl, context.accessToken);

        const videos = statsData.items.map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          publishedAt: video.snippet.publishedAt,
          commentCount: parseInt(video.statistics.commentCount || '0'),
          viewCount: parseInt(video.statistics.viewCount || '0'),
          url: `https://www.youtube.com/watch?v=${video.id}`,
        }));

        // Filter videos that have comments
        const videosWithComments = videos.filter((v: any) => v.commentCount > 0);


        return JSON.stringify({
          success: true,
          videos: videosWithComments,
          count: videosWithComments.length,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          videos: [],
        });
      }
    },
    {
      name: 'fetch_recent_youtube_videos',
      description: 'Fetch recent YouTube videos that have comments to process.',
      schema: z.object({
        limit: z.number().default(10).describe('Maximum number of videos to fetch'),
      }),
    }
  );

  /**
   * Fetch comments for a specific video
   * Checks if we already replied to each comment
   */
  const fetchCommentsForVideo = tool(
    async ({ videoId, limit }) => {
      try {

        // Get our channel ID to check for existing replies
        let ourChannelId = context.channelId;
        if (!ourChannelId) {
          const fetchedChannelId = await getMyChannelId(context.accessToken);
          ourChannelId = fetchedChannelId || undefined;
        }

        // Fetch comment threads (top-level comments)
        const url = buildYouTubeApiUrl(
          'commentThreads',
          {
            part: 'snippet,replies',
            videoId: videoId,
            maxResults: limit.toString(),
            order: 'time', // Get most recent comments first
            textFormat: 'plainText',
          }
        );

        const data = await makeYouTubeRequest(url, context.accessToken);

        if (!data.items || data.items.length === 0) {
          return JSON.stringify({
            success: true,
            comments: [],
            total: 0,
            unanswered: 0,
            message: 'No comments found on this video',
          });
        }

        const comments: RawComment[] = [];

        for (const thread of data.items) {
          const topComment = thread.snippet.topLevelComment;
          const snippet = topComment.snippet;
          
          // Check if we already replied to this comment
          let hasOurReply = false;
          
          if (thread.snippet.totalReplyCount > 0 && thread.replies) {
            // Check if any reply is from our channel
            hasOurReply = thread.replies.comments.some(
              (reply: any) => reply.snippet.authorChannelId?.value === ourChannelId
            );
          }

          comments.push({
            id: topComment.id,
            text: snippet.textDisplay,
            username: snippet.authorDisplayName,
            timestamp: snippet.publishedAt,
            likeCount: snippet.likeCount || 0,
            postId: videoId,
            platform: 'youtube',
            hasReply: hasOurReply,
          });
        }

        // Filter out comments we already replied to
        const unansweredComments = comments.filter(c => !c.hasReply);


        return JSON.stringify({
          success: true,
          comments: unansweredComments,
          total: comments.length,
          unanswered: unansweredComments.length,
        });
      } catch (error) {
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle specific YouTube API errors
        let userMessage = errorMessage;
        if (errorMessage.includes('commentsDisabled')) {
          userMessage = 'Comments are disabled on this video';
        } else if (errorMessage.includes('quotaExceeded')) {
          userMessage = 'YouTube API quota exceeded. Please try again later.';
        } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
          userMessage = 'Permission denied. Please reconnect your YouTube account with the required scopes.';
        }
        
        return JSON.stringify({
          success: false,
          error: userMessage,
          comments: [],
        });
      }
    },
    {
      name: 'fetch_comments_for_youtube_video',
      description: 'Fetch comments for a specific YouTube video. Automatically filters out comments we already replied to.',
      schema: z.object({
        videoId: z.string().describe('The YouTube video ID to fetch comments for'),
        limit: z.number().default(50).describe('Maximum number of comments to fetch'),
      }),
    }
  );

  return [fetchRecentVideos, fetchCommentsForVideo];
}
