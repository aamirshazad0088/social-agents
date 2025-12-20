// Force all dashboard routes to be dynamically rendered (prevents SSG during build)
export const dynamic = 'force-dynamic';

'use client'

import React from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { MediaProvider } from '@/contexts/MediaContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardProvider>
            <MediaProvider>
                <DashboardLayout>
                    {children}
                </DashboardLayout>
            </MediaProvider>
        </DashboardProvider>
    );
}
