'use client';

import React from 'react';
import dynamicImport from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import to avoid SSR issues with the complex component
const MetaAdsManager = dynamicImport(
  () => import('@/components/meta-ads/MetaAdsManager'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
);

export default function MetaAdsPage() {
  return <MetaAdsManager />;
}
