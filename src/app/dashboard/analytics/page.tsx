'use client'

import { useDashboard } from '@/contexts/DashboardContext';
import dynamicImport from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import with no SSR to prevent hydration errors with Recharts
const AnalyticsDashboard = dynamicImport(
    () => import('@/components/analytics/AnalyticsDashboard'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }
);

export default function AnalyticsPage() {
    const { posts, loading, initialLoading } = useDashboard();

    if (loading || initialLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return <AnalyticsDashboard posts={posts} />;
}
