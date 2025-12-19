'use client'

import React, { useMemo } from 'react';
import { Post, PostStatus, Platform } from '@/types';
import PublishedCard from '@/components/history/HistoryCard';
import { Badge } from '@/components/ui/badge';
import { BookCheck, Zap } from 'lucide-react';

interface PublishedViewProps {
    posts: Post[];
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    onPublishPost?: (post: Post) => Promise<void>;
    connectedAccounts: Record<Platform, boolean>;
}

const PublishedView: React.FC<PublishedViewProps> = ({ posts = [], onUpdatePost, onDeletePost, onPublishPost, connectedAccounts }) => {
    const postsForPublishing = useMemo(() => {
        // Include failed posts so users can see and retry them
        const relevantPosts = (posts || []).filter(post => ['ready_to_publish', 'scheduled', 'published', 'failed'].includes(post.status));

        return relevantPosts
            .sort((a, b) => {
                // Failed posts show first so users notice them
                const statusOrder: Partial<Record<PostStatus, number>> = {
                    'failed': 0,
                    'ready_to_publish': 1,
                    'scheduled': 2,
                    'published': 3,
                };
                const weightA = statusOrder[a.status] ?? 99;
                const weightB = statusOrder[b.status] ?? 99;
                if (weightA !== weightB) {
                    return weightA - weightB;
                }
                const dateA = a.publishedAt || a.scheduledAt || a.createdAt;
                const dateB = b.publishedAt || b.scheduledAt || b.createdAt;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
    }, [posts]);

    if (postsForPublishing.length === 0) {
        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950">
                    {/* Animated background elements - Enhanced */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Large animated orbs */}
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse"
                            style={{ animationDelay: '1s', animationDuration: '3s' }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"
                            style={{ animationDelay: '1.5s', animationDuration: '4s' }} />

                        {/* Additional floating orbs */}
                        <div className="absolute top-10 right-1/4 w-32 h-32 bg-purple-400/25 rounded-full blur-2xl animate-pulse"
                            style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
                        <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-violet-400/25 rounded-full blur-2xl animate-pulse"
                            style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
                    </div>

                    {/* Grid pattern overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

                    <div className="relative px-6 py-5">
                        <div className="flex items-center gap-4">
                            {/* Logo with enhanced glow */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl blur-xl opacity-75 animate-pulse group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 rounded-2xl blur-2xl opacity-50 animate-pulse"
                                    style={{ animationDelay: '0.5s' }} />
                                <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-3 rounded-2xl shadow-2xl transform transition-transform group-hover:scale-105">
                                    <BookCheck className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                    Publishing Command Center
                                    <Badge className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white border-0 text-xs shadow-lg hover:shadow-purple-500/50 transition-shadow">
                                        <Zap className="w-3 h-3 mr-1 animate-pulse" />
                                        Ready to Publish
                                    </Badge>
                                </h1>
                                <p className="text-white/80 mt-1 text-sm">
                                    Publish and schedule your finalized content across all platforms
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-muted/30 to-background">
                    <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-xl px-8">
                        <h2 className="text-2xl font-semibold text-foreground">Nothing to Publish</h2>
                        <p className="text-muted-foreground mt-2">Create content or send media from Library and it will appear here, ready for publishing.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950">
                {/* Animated background elements - Enhanced */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* Large animated orbs */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse"
                        style={{ animationDelay: '1s', animationDuration: '3s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"
                        style={{ animationDelay: '1.5s', animationDuration: '4s' }} />

                    {/* Additional floating orbs */}
                    <div className="absolute top-10 right-1/4 w-32 h-32 bg-purple-400/25 rounded-full blur-2xl animate-pulse"
                        style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
                    <div className="absolute bottom-10 left-1/3 w-40 h-40 bg-violet-400/25 rounded-full blur-2xl animate-pulse"
                        style={{ animationDelay: '2s', animationDuration: '3.5s' }} />
                </div>

                {/* Grid pattern overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

                <div className="relative px-6 py-5">
                    <div className="flex items-center gap-4">
                        {/* Logo with enhanced glow */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl blur-xl opacity-75 animate-pulse group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 rounded-2xl blur-2xl opacity-50 animate-pulse"
                                style={{ animationDelay: '0.5s' }} />
                            <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-3 rounded-2xl shadow-2xl transform transition-transform group-hover:scale-105">
                                <BookCheck className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                Publish Studio
                                <Badge className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white border-0 text-xs shadow-lg hover:shadow-purple-500/50 transition-shadow">
                                    <Zap className="w-3 h-3 mr-1 animate-pulse" />
                                    Ready to Publish
                                </Badge>
                            </h1>
                            <p className="text-white/80 mt-1 text-sm">
                                Publish and schedule your finalized content across all platforms
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 bg-gradient-to-b from-muted/30 to-background overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {postsForPublishing.map(post => (
                        <PublishedCard
                            key={post.id}
                            post={post}
                            onUpdatePost={onUpdatePost}
                            onDeletePost={onDeletePost}
                            onPublishPost={onPublishPost}
                            connectedAccounts={connectedAccounts}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PublishedView;
