'use client'

import { useDashboard } from '@/contexts/DashboardContext';
import PublishedView from '@/components/history/HistoryView';
import { Loader2 } from 'lucide-react';

export default function HistoryPage() {
    const { posts, loading, initialLoading, connectedAccounts, updatePost, deletePost, publishPost } = useDashboard();

    if (loading || initialLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <PublishedView
            posts={posts}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            onPublishPost={publishPost}
            connectedAccounts={connectedAccounts}
        />
    );
}
