/**
 * Comment Agent Types
 * Type definitions for the AI-powered comment management system
 */

// ============================================================================
// Platform Types
// ============================================================================

export type CommentPlatform = 'instagram' | 'facebook' | 'youtube' | 'tiktok';

// ============================================================================
// Comment Types
// ============================================================================

export interface RawComment {
  id: string;
  text: string;
  username: string;
  timestamp?: string;
  likeCount?: number;
  postId: string;
  platform: CommentPlatform;
  hasReply?: boolean; // Whether we already replied
}

export interface PendingComment {
  id: string;
  comment_id: string;
  post_id: string;
  platform: CommentPlatform;
  workspace_id: string;
  username: string;
  original_comment: string;
  comment_timestamp?: string;
  post_caption?: string;
  summary: string;
  status: 'pending'; // Only pending - rows deleted after reply/dismiss
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Knowledge Base Types
// ============================================================================

export type KnowledgeCategory = 
  | 'faq'
  | 'policy'
  | 'product'
  | 'pricing'
  | 'shipping'
  | 'returns'
  | 'support'
  | 'hours'
  | 'contact'
  | 'general';

export interface KnowledgeEntry {
  id: string;
  workspace_id: string;
  category: KnowledgeCategory;
  title: string;
  question?: string;
  answer: string;
  keywords?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Agent Request/Response Types
// ============================================================================

export interface ProcessCommentsRequest {
  workspaceId: string;
  userId: string;
  platforms?: CommentPlatform[];
  postIds?: string[]; // Specific posts, or all recent if empty
  runType?: 'cron' | 'manual';
}

export interface ProcessCommentsResponse {
  success: boolean;
  commentsFetched: number;
  autoReplied: number;
  escalated: number;
  errors: number;
  executionTime: number;
  errorMessage?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PendingCommentsResponse {
  success: boolean;
  comments: PendingComment[];
  stats: {
    pending: number;
    total: number;
  };
}

export interface ReplyResponse {
  success: boolean;
  replyId?: string;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  hidden?: boolean; // true if comment was hidden instead of deleted
  error?: string;
}

// ============================================================================
// Credentials Types
// ============================================================================

export interface CommentAgentCredentials {
  accessToken: string; // Meta platforms (Facebook/Instagram) access token
  instagramUserId?: string;
  facebookPageId?: string;
  pageAccessToken?: string;
  youtubeAccessToken?: string; // Separate YouTube access token
  youtubeChannelId?: string;
}
