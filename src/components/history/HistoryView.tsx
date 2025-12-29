'use client'

import React, { useMemo, useState } from 'react';
import { Post, PostStatus, Platform } from '@/types';
import PublishedCard from '@/components/history/HistoryCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    BookCheck, Search, Grid, List, Filter, X,
    Image as ImageIcon, Video, Layers, Film, Clock, CheckCircle2, AlertCircle, Send
} from 'lucide-react';
import { PLATFORMS } from '@/constants';

interface PublishedViewProps {
    posts: Post[];
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    onPublishPost?: (post: Post) => Promise<void>;
    connectedAccounts: Record<Platform, boolean>;
}

type StatusFilter = 'all' | 'ready_to_publish' | 'scheduled' | 'published' | 'failed';
type TypeFilter = 'all' | 'image' | 'video' | 'carousel' | 'reel' | 'story';
type PlatformFilter = 'all' | Platform;

const PublishedView: React.FC<PublishedViewProps> = ({ posts = [], onUpdatePost, onDeletePost, onPublishPost, connectedAccounts }) => {
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const postsForPublishing = useMemo(() => {
        let filteredPosts = (posts || []).filter(post =>
            ['ready_to_publish', 'scheduled', 'published', 'failed'].includes(post.status)
        );

        // Apply status filter
        if (statusFilter !== 'all') {
            filteredPosts = filteredPosts.filter(post => post.status === statusFilter);
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            filteredPosts = filteredPosts.filter(post => {
                if (typeFilter === 'image') return !post.generatedVideoUrl && !post.carouselImages?.length;
                if (typeFilter === 'video') return !!post.generatedVideoUrl;
                if (typeFilter === 'carousel') return post.carouselImages && post.carouselImages.length > 1;
                if (typeFilter === 'reel') return post.postType === 'reel';
                if (typeFilter === 'story') return post.postType === 'story';
                return true;
            });
        }

        // Apply platform filter
        if (platformFilter !== 'all') {
            filteredPosts = filteredPosts.filter(post => post.platforms.includes(platformFilter));
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredPosts = filteredPosts.filter(post =>
                post.topic?.toLowerCase().includes(query) ||
                post.platforms.some(p => p.toLowerCase().includes(query))
            );
        }

        // Sort by status priority and date
        return filteredPosts.sort((a, b) => {
            const statusOrder: Partial<Record<PostStatus, number>> = {
                'failed': 0,
                'ready_to_publish': 1,
                'scheduled': 2,
                'published': 3,
            };
            const weightA = statusOrder[a.status] ?? 99;
            const weightB = statusOrder[b.status] ?? 99;
            if (weightA !== weightB) return weightA - weightB;
            const dateA = a.publishedAt || a.scheduledAt || a.createdAt;
            const dateB = b.publishedAt || b.scheduledAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [posts, statusFilter, typeFilter, platformFilter, searchQuery]);

    // Count posts by status
    const statusCounts = useMemo(() => {
        const counts = { ready_to_publish: 0, scheduled: 0, published: 0, failed: 0 };
        posts.forEach(post => {
            if (counts[post.status as keyof typeof counts] !== undefined) {
                counts[post.status as keyof typeof counts]++;
            }
        });
        return counts;
    }, [posts]);

    const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || platformFilter !== 'all' || searchQuery !== '';

    const clearFilters = () => {
        setStatusFilter('all');
        setTypeFilter('all');
        setPlatformFilter('all');
        setSearchQuery('');
    };

    // Filter button component
    const FilterButton: React.FC<{
        active: boolean;
        onClick: () => void;
        children: React.ReactNode;
        count?: number;
    }> = ({ active, onClick, children, count }) => (
        <button
            onClick={onClick}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 ${active
                ? 'bg-primary text-white'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className={`text-[9px] px-1 rounded ${active ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    if (postsForPublishing.length === 0 && !hasActiveFilters) {
        return (
            <div className="flex flex-col h-full">
                {/* Header - Library Style */}
                <div className="bg-gradient-to-r from-orange-100 via-pink-50 to-rose-100 dark:from-orange-950/30 dark:via-pink-950/30 dark:to-rose-950/30 px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-orange-400 to-pink-500 p-2.5 rounded-xl shadow-lg">
                                <BookCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-semibold">Publishing Studio</h2>
                                    <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-2">0 items</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Publish and schedule your content</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4 bg-background">
                    <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg px-6">
                        <h2 className="text-lg font-semibold text-foreground">Nothing to Publish</h2>
                        <p className="text-muted-foreground text-sm mt-1">Create content or send media from Library.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header & Filters - Library Style */}
            <div className="bg-gradient-to-r from-orange-100 via-pink-50 to-rose-100 dark:from-orange-950/30 dark:via-pink-950/30 dark:to-rose-950/30 px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                    {/* Left - Title */}
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-orange-400 to-pink-500 p-2.5 rounded-xl shadow-lg">
                            <BookCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold">Publishing Studio</h2>
                                <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-2">{postsForPublishing.length} items</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Publish and schedule your content</p>
                        </div>
                    </div>

                    {/* Right - Filter Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Status Filters */}
                        <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                            All
                        </FilterButton>
                        <FilterButton active={statusFilter === 'ready_to_publish'} onClick={() => setStatusFilter('ready_to_publish')}>
                            Ready
                        </FilterButton>
                        <FilterButton active={statusFilter === 'scheduled'} onClick={() => setStatusFilter('scheduled')}>
                            Scheduled
                        </FilterButton>
                        <FilterButton active={statusFilter === 'published'} onClick={() => setStatusFilter('published')}>
                            Published
                        </FilterButton>

                        <div className="w-px h-4 bg-border/50" />

                        {/* Type Filters */}
                        <FilterButton active={typeFilter === 'image'} onClick={() => setTypeFilter('image')}>
                            <ImageIcon className="w-3 h-3" /> Images
                        </FilterButton>
                        <FilterButton active={typeFilter === 'video'} onClick={() => setTypeFilter('video')}>
                            <Video className="w-3 h-3" /> Videos
                        </FilterButton>
                        <FilterButton active={typeFilter === 'carousel'} onClick={() => setTypeFilter('carousel')}>
                            <Layers className="w-3 h-3" /> Carousel
                        </FilterButton>

                        <div className="w-px h-4 bg-border/50" />

                        {/* Platform Filters */}
                        {PLATFORMS.map(platform => {
                            const Icon = platform.icon;
                            return (
                                <FilterButton
                                    key={platform.id}
                                    active={platformFilter === platform.id}
                                    onClick={() => setPlatformFilter(platform.id as Platform)}
                                >
                                    <Icon className="w-3 h-3" />
                                </FilterButton>
                            );
                        })}

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-2 bg-background overflow-auto">
                {postsForPublishing.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center py-8">
                            <p className="text-muted-foreground text-sm">No posts match your filters</p>
                            <button onClick={clearFilters} className="text-primary text-xs mt-1 hover:underline">
                                Clear filters
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
                        : "flex flex-col gap-2"
                    }>
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
                )}
            </div>
        </div>
    );
};

export default PublishedView;
