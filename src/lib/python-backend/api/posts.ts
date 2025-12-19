/**
 * Posts API
 * 
 * API client for social media post management including CRUD operations,
 * scheduling, and publishing functionality.
 */

import { get, post, put, del } from '../client';
import { ENDPOINTS } from '../config';
import type {
    Post,
    CreatePostRequest,
    UpdatePostRequest,
    DeletePostParams,
    ApiResponse,
} from '../types';

/**
 * Get all posts for a workspace
 * 
 * Retrieves all posts for the specified workspace, ordered by creation date.
 * 
 * @param userId - User ID for authentication
 * @param workspaceId - Workspace ID to fetch posts for
 * @returns Promise resolving to array of posts
 */
export async function getPosts(
    userId: string,
    workspaceId: string
): Promise<Post[]> {
    return get<Post[]>(ENDPOINTS.posts.base, {
        params: {
            user_id: userId,
            workspace_id: workspaceId,
        },
    });
}

/**
 * Get a single post by ID
 * 
 * @param postId - Post ID to retrieve
 * @param workspaceId - Workspace ID for verification
 * @returns Promise resolving to the post
 */
export async function getPost(
    postId: string,
    workspaceId: string
): Promise<Post> {
    return get<Post>(ENDPOINTS.posts.byId(postId), {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Create a new post
 * 
 * Creates a new social media post draft in the workspace.
 * 
 * @param userId - User ID for authentication
 * @param request - Post creation request with content and settings
 * @returns Promise resolving to created post response
 */
export async function createPost(
    userId: string,
    request: CreatePostRequest
): Promise<ApiResponse<Post>> {
    return post<ApiResponse<Post>>(ENDPOINTS.posts.base, request, {
        params: { user_id: userId },
    });
}

/**
 * Update an existing post
 * 
 * Updates post content, settings, or status.
 * 
 * @param userId - User ID for authentication
 * @param postId - Post ID to update
 * @param request - Update request with fields to modify
 * @returns Promise resolving to updated post
 */
export async function updatePost(
    userId: string,
    postId: string,
    request: UpdatePostRequest
): Promise<Post> {
    return put<Post>(ENDPOINTS.posts.byId(postId), request, {
        params: { user_id: userId },
    });
}

/**
 * Delete a post
 * 
 * Permanently removes a post from the workspace.
 * 
 * @param userId - User ID for authentication
 * @param postId - Post ID to delete
 * @param workspaceId - Workspace ID for verification
 * @returns Promise resolving when deletion is complete
 */
export async function deletePost(
    userId: string,
    postId: string,
    workspaceId: string
): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(ENDPOINTS.posts.byId(postId), {
        params: {
            user_id: userId,
            workspace_id: workspaceId,
        },
    });
}

/**
 * Schedule a post for future publishing
 * 
 * Sets the scheduled publication time for a post.
 * 
 * @param userId - User ID for authentication
 * @param postId - Post ID to schedule
 * @param workspaceId - Workspace ID
 * @param scheduledAt - ISO 8601 datetime string for scheduled publication
 * @returns Promise resolving to updated post
 */
export async function schedulePost(
    userId: string,
    postId: string,
    workspaceId: string,
    scheduledAt: string
): Promise<Post> {
    return put<Post>(ENDPOINTS.posts.byId(postId), {
        workspaceId,
        post: {
            topic: '',
            platforms: [],
            status: 'scheduled',
            scheduledAt,
        },
    }, {
        params: { user_id: userId },
    });
}

/**
 * Update post status
 * 
 * Changes the status of a post (draft, scheduled, published, archived).
 * 
 * @param userId - User ID for authentication
 * @param postId - Post ID
 * @param workspaceId - Workspace ID
 * @param status - New status value
 * @returns Promise resolving to updated post
 */
export async function updatePostStatus(
    userId: string,
    postId: string,
    workspaceId: string,
    status: 'draft' | 'scheduled' | 'published' | 'archived'
): Promise<Post> {
    return put<Post>(ENDPOINTS.posts.byId(postId), {
        workspaceId,
        post: {
            topic: '',
            platforms: [],
            status,
        },
    }, {
        params: { user_id: userId },
    });
}

/**
 * Get posts API service info
 * 
 * Retrieves information about the posts service.
 * 
 * @returns Promise resolving to service info
 */
export async function getPostsInfo(): Promise<{
    service: string;
    version: string;
    endpoints: Record<string, Record<string, string>>;
    post_types: string[];
    statuses: string[];
}> {
    return get(ENDPOINTS.posts.info);
}
