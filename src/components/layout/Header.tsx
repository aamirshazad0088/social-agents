'use client'

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationBell from '@/components/ui/NotificationBell';
import { User } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-sans">
            {/* Empty header - content moved to sidebar */}
        </header>
    );
}
