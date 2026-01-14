'use client';

import React from 'react';
import dynamicImport from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import to avoid SSR issues
const ContentCalendarDashboard = dynamicImport(
    () => import('./components/ContentCalendarDashboard'),
    {
        loading: () => (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        ),
        ssr: false,
    }
);

export default function ContentCalendarPage() {
    return <ContentCalendarDashboard />;
}
