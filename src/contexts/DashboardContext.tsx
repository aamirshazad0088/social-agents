'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Post, Platform } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { publishingService } from '@/services/publishingService';

interface DashboardContextType {
    posts: Post[];
    loading: boolean;
    initialLoading: boolean;
    connectedAccounts: Record<Platform, boolean>;
    isApiKeyReady: boolean;
    addPost: (post: Post) => Promise<void>;
    addMultiplePosts: (posts: Post[]) => Promise<void>;
    updatePost: (post: Post) => Promise<void>;
    deletePost: (postId: string, postTitle?: string) => Promise<void>;
    publishPost: (post: Post) => Promise<void>;
    refreshData: () => Promise<void>;
    checkAndSetApiKey: () => Promise<void>;
    handleSelectKey: () => Promise<void>;
    resetApiKeyStatus: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const { user, workspaceId } = useAuth();
    const { addNotification } = useNotifications();
    
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false); // For manual refresh loading indicator
    const [initialLoading, setInitialLoading] = useState(true); // For initial data load
    const dataLoadedRef = useRef(false);
    const currentWorkspaceRef = useRef<string | null>(null);

    const [connectedAccounts, setConnectedAccounts] = useState<Record<Platform, boolean>>({
        twitter: false,
        linkedin: false,
        facebook: false,
        instagram: false,
        tiktok: false,
        youtube: false
    });

    const [isApiKeyReady, setIsApiKeyReady] = useState(false);

    // --- Data Loading ---

    const loadData = useCallback(async (force = false) => {
        if (!user || !workspaceId) {
            // Don't keep showing loading if there's no user/workspace
            setInitialLoading(false);
            return;
        }

        // Only load data once per workspace unless forced
        if (!force && dataLoadedRef.current && currentWorkspaceRef.current === workspaceId) {
            return;
        }

        try {
            // Show loading spinner on manual refresh
            if (force) {
                setLoading(true);
            }

            // Load in background without blocking UI
            // Use cache: 'no-store' to bypass browser cache and get fresh data
            const [postsRes, credStatusRes] = await Promise.all([
                fetch(`/api/posts?workspace_id=${workspaceId}`, { cache: 'no-store' }),
                fetch('/api/credentials/status', { cache: 'no-store' })
            ]);

            if (!postsRes.ok) throw new Error('Failed to load posts');
            if (!credStatusRes.ok) throw new Error('Failed to load credentials status');

            const [postsResponse, accountsStatus] = await Promise.all([
                postsRes.json(),
                credStatusRes.json()
            ]);

            // API returns { success: true, data: [...posts] }, extract the data array
            const dbPosts = postsResponse?.data || postsResponse || [];

            const accountsSummary: Record<Platform, boolean> = {
                twitter: accountsStatus.twitter?.isConnected ?? false,
                linkedin: accountsStatus.linkedin?.isConnected ?? false,
                facebook: accountsStatus.facebook?.isConnected ?? false,
                instagram: accountsStatus.instagram?.isConnected ?? false,
                tiktok: accountsStatus.tiktok?.isConnected ?? false,
                youtube: accountsStatus.youtube?.isConnected ?? false,
            };

            setPosts(Array.isArray(dbPosts) ? dbPosts : []);
            setConnectedAccounts(accountsSummary);
            
            dataLoadedRef.current = true;
            currentWorkspaceRef.current = workspaceId;
        } catch (error) {
            addNotification('error', 'Load Error', 'Failed to load dashboard data');
        } finally {
            setInitialLoading(false);
            if (force) {
                setLoading(false);
            }
        }
    }, [user, workspaceId, addNotification]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- API Key Management ---

    const checkAndSetApiKey = useCallback(async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsApiKeyReady(true);
        } else {
            setIsApiKeyReady(false);
        }
    }, []);

    useEffect(() => {
        checkAndSetApiKey();
    }, [checkAndSetApiKey]);

    const handleSelectKey = useCallback(async () => {
        if(window.aistudio) {
            await window.aistudio.openSelectKey();
            setIsApiKeyReady(true);
        }
    }, []);

    // --- Post Actions ---

    const addPost = useCallback(async (post: Post) => {
        setPosts((prev) => [post, ...prev]);

        if (user && workspaceId) {
            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post, workspaceId }),
                });

                if (!response.ok) throw new Error('Failed to create post');

                addNotification('post_scheduled', 'New Post Created', `Post "${post.topic}" ready for publishing.`, post.id);
            } catch (error) {
                addNotification('error', 'Save Error', 'Failed to save post');
                setPosts((prev) => prev.filter((p) => p.id !== post.id));
            }
        }
    }, [user, workspaceId, addNotification]);

    const addMultiplePosts = useCallback(async (newPosts: Post[]) => {
        // Optimistically add posts to UI
        setPosts((prev) => [...newPosts, ...prev]);

        if (user && workspaceId) {
            try {
                // Use Promise.all for parallel requests instead of sequential loop
                // This significantly improves performance for bulk post creation
                const results = await Promise.allSettled(
                    newPosts.map(post =>
                        fetch('/api/posts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ post, workspaceId }),
                        }).then(res => {
                            if (!res.ok) throw new Error(`Failed to save post: ${post.topic}`);
                            return res.json();
                        })
                    )
                );

                const succeeded = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;

                if (failed > 0) {
                    addNotification('error', 'Partial Save', `${succeeded} posts saved, ${failed} failed.`);
                } else {
                    addNotification('post_scheduled', 'Posts Created', `${newPosts.length} posts ready for publishing.`);
                }
            } catch (error) {
                addNotification('error', 'Save Error', 'Failed to save posts');
            }
        }
    }, [user, workspaceId, addNotification]);

    const updatePost = useCallback(async (updatedPost: Post) => {
        setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));

        if (user && workspaceId) {
            try {
                const response = await fetch(`/api/posts/${updatedPost.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post: updatedPost, workspaceId }),
                });

                if (!response.ok) throw new Error('Failed to update post');
                
                const savedPost = await response.json();
                
                addNotification('post_scheduled', 'Post Updated', `"${updatedPost.topic}" updated.`);
            } catch (error) {
                addNotification('error', 'Update Error', 'Failed to save changes');
            }
        }
    }, [user, workspaceId, addNotification]);

    const deletePost = useCallback(async (postId: string, postTitle?: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));

        if (user && workspaceId) {
            try {
                const response = await fetch(`/api/posts/${postId}?workspace_id=${workspaceId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) throw new Error('Failed to delete post');
                
                // Log delete activity
                await fetch('/api/workspace/activity/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'post_deleted',
                        postId,
                        postTitle: postTitle || 'Untitled',
                    }),
                }).catch(() => {});
                
                addNotification('post_scheduled', 'Post Deleted', 'Post removed.');
            } catch (error) {
                addNotification('error', 'Delete Error', 'Failed to delete post');
            }
        }
    }, [user, workspaceId, addNotification]);

    const publishPost = useCallback(async (post: Post) => {
        try {
            const validation = publishingService.validatePostForPublishing(post);
            if (!validation.valid) {
                addNotification('error', 'Validation Error', validation.errors?.join(', ') || 'Validation failed');
                return;
            }

            const results = await publishingService.publishPost(post);
            const successCount = results.filter((r) => r.success).length;
            const failedResults = results.filter((r) => !r.success);

            // Log detailed results for debugging

            // Only proceed if at least one platform succeeded
            if (successCount === 0) {
                const errorMessages = failedResults.map(r => `${r.platform}: ${r.error}`).join(', ');
                addNotification('error', 'Publishing Failed', errorMessages || 'Failed to publish to any platform');
                return; // Don't delete the post if all platforms failed
            }

            if (user && workspaceId) {
                // Log publish activity
                const successPlatforms = results.filter(r => r.success).map(r => r.platform);
                await fetch('/api/workspace/activity/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'post_published',
                        postId: post.id,
                        postTitle: post.topic,
                        platforms: successPlatforms,
                    }),
                }).catch(() => {});
            }

            // Only delete post if at least one platform succeeded
            await deletePost(post.id, post.topic);

            addNotification('post_published', 'Post Published', `Posted to ${successCount}/${results.length} platforms`, post.id);
        } catch (error) {
            addNotification('error', 'Publishing Error', 'Failed to publish post');
        }
    }, [user, workspaceId, deletePost, addNotification]);

    // --- Polling Logic (Video & Schedule) ---

    const postsRef = useRef(posts);
    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    const pollVideoStatuses = useCallback(() => {
        const videoPosts = postsRef.current.filter(
            p => p.isGeneratingVideo && 
            p.videoOperation?.id && 
            p.videoOperation?.status !== 'completed' && 
            p.videoOperation?.status !== 'failed'
        );
        
        if (videoPosts.length === 0) return;
        
        Promise.allSettled(
            videoPosts.map(post => 
                fetch('/api/ai/media/video/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId: post.videoOperation.id }),
                }).then(res => res.json().then(data => ({ post, data })))
            )
        ).then(results => {
            results.forEach(async (result) => {
                if (result.status === 'rejected') return;
                
                const { post, data } = result.value;
                const updatedVideo = data.data.video;
                
                if (updatedVideo.status === 'completed') {
                    try {
                        const fetchResponse = await fetch('/api/ai/media/video/fetch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoId: updatedVideo.id }),
                        });
                        const { data: videoData } = await fetchResponse.json();
                        const videoUrl = videoData.videoData;
                        
                        setPosts(prev => prev.map(p => p.id === post.id ? {
                            ...p,
                            generatedVideoUrl: videoUrl,
                            isGeneratingVideo: false,
                            videoGenerationStatus: 'Completed!',
                            videoOperation: updatedVideo
                        } : p));
                        
                        addNotification('video_complete', 'Video Ready', `Video for "${post.topic}" is ready!`, post.id);
                    } catch (error) {
                        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isGeneratingVideo: false, videoGenerationStatus: 'Failed.' } : p));
                    }
                } else if (updatedVideo.status === 'failed') {
                    setPosts(prev => prev.map(p => p.id === post.id ? { 
                        ...p, 
                        isGeneratingVideo: false, 
                        videoGenerationStatus: `Failed: ${updatedVideo.error?.message || 'Error'}`, 
                        videoOperation: updatedVideo 
                    } : p));
                } else {
                    setPosts(prev => prev.map(p => p.id === post.id ? { 
                        ...p, 
                        videoGenerationStatus: `Processing... ${updatedVideo.progress || 0}%`, 
                        videoOperation: updatedVideo 
                    } : p));
                }
            });
        });
    }, []);

    // Note: Scheduled post publishing is handled server-side by cron job
    // See /api/cron/publish-scheduled - no client-side polling needed

    // Track which failed posts we've already notified about
    const notifiedFailedPostsRef = useRef<Set<string>>(new Set());

    // Check for newly failed posts and show notifications
    const checkForFailedPosts = useCallback(() => {
        const failedPosts = postsRef.current.filter(
            (post) => post.status === 'failed' && !notifiedFailedPostsRef.current.has(post.id)
        );

        for (const post of failedPosts) {
            // Get error message from post
            const publishLog = (post.content as any)?._publishLog;
            const errorMessage = publishLog?.error || (post as any).publish_error || 'Unknown error';
            
            addNotification(
                'post_failed',
                'Scheduled Post Failed',
                `"${post.topic?.substring(0, 50)}${post.topic?.length > 50 ? '...' : ''}" failed to publish: ${errorMessage}`,
                post.id
            );
            
            // Mark as notified
            notifiedFailedPostsRef.current.add(post.id);
        }
    }, [addNotification]);

    // Poll for post status changes (failed posts, deleted/published posts)
    const pollPostStatuses = useCallback(async () => {
        if (!workspaceId) return;
        
        try {
            const response = await fetch(`/api/posts?workspace_id=${workspaceId}`);
            if (response.ok) {
                const freshPosts = await response.json();
                
                // Check for status changes and deletions
                const currentPostsMap = new Map(postsRef.current.map(p => [p.id, p]));
                const freshPostIds = new Set(freshPosts.map((p: Post) => p.id));
                
                // Check for deleted posts (scheduled posts that were published and deleted)
                for (const currentPost of postsRef.current) {
                    if (currentPost.status === 'scheduled' && !freshPostIds.has(currentPost.id)) {
                        // Post was deleted, likely because it was published
                        addNotification(
                            'post_published',
                            'Scheduled Post Published!',
                            `"${currentPost.topic?.substring(0, 50)}" was published successfully`,
                            currentPost.id
                        );
                    }
                }
                
                // Check for status changes in existing posts
                for (const freshPost of freshPosts) {
                    const currentPost = currentPostsMap.get(freshPost.id);
                    
                    if (currentPost) {
                        // Check if post just failed
                        if (currentPost.status === 'scheduled' && freshPost.status === 'failed') {
                            const publishLog = (freshPost.content as any)?._publishLog;
                            const errorMessage = publishLog?.error || freshPost.publish_error || 'Unknown error';
                            
                            addNotification(
                                'post_failed',
                                'Scheduled Post Failed',
                                `"${freshPost.topic?.substring(0, 50)}" failed: ${errorMessage}`,
                                freshPost.id
                            );
                            notifiedFailedPostsRef.current.add(freshPost.id);
                        }
                    }
                }
                
                // Update posts state
                setPosts(freshPosts);
            }
        } catch (error) {
        }
    }, [workspaceId, addNotification]);

    useEffect(() => {
        if (!user || !workspaceId || !dataLoadedRef.current) return;

        // Poll for video generation status
        const videoPollInterval = setInterval(pollVideoStatuses, 15000);
        
        // Poll for post status changes (scheduled -> published/failed) every 15 minutes
        const postStatusInterval = setInterval(pollPostStatuses, 15 * 60 * 1000);
        
        // Initial check for failed posts
        checkForFailedPosts();

        return () => {
            clearInterval(videoPollInterval);
            clearInterval(postStatusInterval);
        };
    }, [user, workspaceId, pollVideoStatuses, pollPostStatuses, checkForFailedPosts]);

    const value = useMemo(() => ({
        posts,
        loading,
        initialLoading,
        connectedAccounts,
        isApiKeyReady,
        addPost,
        addMultiplePosts,
        updatePost,
        deletePost,
        publishPost,
        refreshData: () => loadData(true),
        checkAndSetApiKey,
        handleSelectKey,
        resetApiKeyStatus: () => setIsApiKeyReady(false)
    }), [
        posts, loading, initialLoading, connectedAccounts, isApiKeyReady,
        addPost, addMultiplePosts, updatePost, deletePost, publishPost,
        loadData, checkAndSetApiKey, handleSelectKey
    ]);

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
