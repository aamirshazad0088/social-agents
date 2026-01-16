'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, X } from 'lucide-react';
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import type { CalendarEntry, PostType, Platform } from '../types';
import { POST_TYPE_LABELS } from '../types';

interface CalendarMonthViewProps {
    entries: CalendarEntry[];
    allEntries?: CalendarEntry[];
    currentDate: Date;
    onEntryClick: (entry: CalendarEntry) => void;
    activeFilter?: Platform;
    onFilterChange?: (platform: Platform | undefined) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Platform icons - using react-icons brand icons
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    instagram: <FaInstagram className="w-3.5 h-3.5" />,
    facebook: <FaFacebookF className="w-3.5 h-3.5" />,
    twitter: <FaXTwitter className="w-3.5 h-3.5" />,
    linkedin: <FaLinkedinIn className="w-3.5 h-3.5" />,
    tiktok: <FaTiktok className="w-3.5 h-3.5" />,
    youtube: <FaYoutube className="w-3.5 h-3.5" />,
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-yellow-400',
    scheduled: 'bg-blue-400',
    published: 'bg-green-400',
    archived: 'bg-gray-400',
};

export function CalendarMonthView({ entries, allEntries, currentDate, onEntryClick, activeFilter, onFilterChange }: CalendarMonthViewProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Calculate total cells needed (might need 5 or 6 rows)
    const totalCells = Math.ceil((startingDay + totalDays) / 7) * 7;

    // Group entries by date
    const entriesByDate = entries.reduce((acc, entry) => {
        const dateKey = entry.scheduled_date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, CalendarEntry[]>);

    const today = new Date().toISOString().split('T')[0];

    // Generate calendar cells
    const cells = Array.from({ length: totalCells }, (_, index) => {
        const dayNumber = index - startingDay + 1;
        const isCurrentMonth = dayNumber > 0 && dayNumber <= totalDays;

        if (!isCurrentMonth) return null;

        const date = new Date(year, month, dayNumber);
        const dateKey = date.toISOString().split('T')[0];
        const dayEntries = entriesByDate[dateKey] || [];
        const isToday = dateKey === today;
        const isPast = dateKey < today;

        return {
            dayNumber,
            date,
            dateKey,
            dayEntries,
            isToday,
            isPast,
        };
    });

    // Count entries by platform (use allEntries if provided)
    const entriesForCounting = allEntries || entries;
    const platformCounts = entriesForCounting.reduce((acc, entry) => {
        acc[entry.platform] = (acc[entry.platform] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handlePlatformClick = (platform: string) => {
        if (onFilterChange) {
            if (activeFilter === platform) {
                onFilterChange(undefined);
            } else {
                onFilterChange(platform as Platform);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Month Stats - Clickable Platform Filters */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
                <span className="text-sm font-medium text-muted-foreground">This Month:</span>
                <Badge variant="secondary" className="font-semibold">
                    {entries.length} posts
                </Badge>
                {Object.entries(platformCounts).map(([platform, count]) => (
                    <Badge
                        key={platform}
                        variant={activeFilter === platform ? "default" : "outline"}
                        className={`gap-1 cursor-pointer transition-all hover:scale-105 ${activeFilter === platform
                            ? 'ring-2 ring-offset-1 ring-primary shadow-md'
                            : 'hover:bg-muted'
                            }`}
                        onClick={() => handlePlatformClick(platform)}
                    >
                        <span>{PLATFORM_ICONS[platform] || '📱'}</span>
                        <span className="capitalize">{platform}</span>
                        <span className={activeFilter === platform ? 'text-primary-foreground/70' : 'text-muted-foreground'}>({count})</span>
                    </Badge>
                ))}
                {activeFilter && (
                    <Badge
                        variant="destructive"
                        className="gap-1 cursor-pointer hover:bg-destructive/80"
                        onClick={() => onFilterChange?.(undefined)}
                    >
                        <X className="w-3 h-3" />
                        Clear
                    </Badge>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl border overflow-hidden shadow-sm">
                {/* Day Headers */}
                <div className="grid grid-cols-7 bg-muted/50 border-b">
                    {DAYS.map((day) => (
                        <div key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                    {cells.map((cell, index) => {
                        if (!cell) {
                            return (
                                <div
                                    key={index}
                                    className="min-h-[120px] border-b border-r last:border-r-0 bg-muted/10"
                                />
                            );
                        }

                        const { dayNumber, dayEntries, isToday, isPast } = cell;

                        return (
                            <div
                                key={index}
                                className={`min-h-[120px] border-b border-r last:border-r-0 p-1.5 transition-colors
                                    ${isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}
                                    ${isPast && !isToday ? 'bg-muted/5' : ''}
                                    hover:bg-muted/20
                                `}
                            >
                                {/* Day Number */}
                                <div className="flex items-center justify-between mb-1">
                                    <div className={`text-sm font-semibold ${isToday
                                        ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm'
                                        : isPast
                                            ? 'text-muted-foreground'
                                            : ''
                                        }`}>
                                        {dayNumber}
                                    </div>
                                    {dayEntries.length > 0 && (
                                        <div className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                            {dayEntries.length}
                                        </div>
                                    )}
                                </div>

                                {/* Entries (show max 3) */}
                                <div className="space-y-1">
                                    {dayEntries.slice(0, 3).map((entry) => (
                                        <div
                                            key={entry.id}
                                            onClick={() => onEntryClick(entry)}
                                            className="group relative px-1.5 py-1 rounded-md text-[11px] text-white cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
                                            style={{ backgroundColor: entry.color }}
                                        >
                                            {/* Status dot */}
                                            <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${STATUS_COLORS[entry.status] || 'bg-gray-400'}`} />

                                            {/* Title */}
                                            <div className="font-medium truncate pr-2">
                                                {entry.title}
                                            </div>

                                            {/* Post Type & Time */}
                                            {(entry.post_type || entry.scheduled_time) && (
                                                <div className="flex items-center gap-1 mt-0.5 text-[9px] text-white/70">
                                                    {entry.post_type && (
                                                        <span className="bg-white/20 px-1 rounded capitalize">
                                                            {POST_TYPE_LABELS[entry.post_type as PostType] || entry.post_type}
                                                        </span>
                                                    )}
                                                    {entry.scheduled_time && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {entry.scheduled_time.slice(0, 5)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {dayEntries.length > 3 && (
                                        <button
                                            onClick={() => dayEntries.length > 0 && onEntryClick(dayEntries[3])}
                                            className="w-full text-[10px] text-muted-foreground hover:text-foreground text-center py-0.5 rounded hover:bg-muted/50 transition-colors"
                                        >
                                            +{dayEntries.length - 3} more
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CalendarMonthView;
