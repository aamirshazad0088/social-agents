'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Image, Video, FileText, MessageSquare, Zap, X } from 'lucide-react';
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import type { CalendarEntry, PostType, Platform } from '../types';
import { POST_TYPE_LABELS } from '../types';

interface CalendarWeekViewProps {
    entries: CalendarEntry[];
    allEntries?: CalendarEntry[]; // All entries for platform counting
    currentDate: Date;
    onEntryClick: (entry: CalendarEntry) => void;
    activeFilter?: Platform;
    onFilterChange?: (platform: Platform | undefined) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Platform icons - using react-icons brand icons
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    instagram: <FaInstagram className="w-3.5 h-3.5" />,
    facebook: <FaFacebookF className="w-3.5 h-3.5" />,
    twitter: <FaXTwitter className="w-3.5 h-3.5" />,
    linkedin: <FaLinkedinIn className="w-3.5 h-3.5" />,
    tiktok: <FaTiktok className="w-3.5 h-3.5" />,
    youtube: <FaYoutube className="w-3.5 h-3.5" />,
};

// Post type icons
const POST_TYPE_ICONS: Record<string, React.ReactNode> = {
    post: <FileText className="w-3 h-3" />,
    reel: <Video className="w-3 h-3" />,
    story: <Zap className="w-3 h-3" />,
    carousel: <Image className="w-3 h-3" />,
    video: <Video className="w-3 h-3" />,
    short: <Video className="w-3 h-3" />,
    thread: <MessageSquare className="w-3 h-3" />,
    tweet: <MessageSquare className="w-3 h-3" />,
};

// Status colors for the dot indicator
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-yellow-400',
    scheduled: 'bg-blue-400',
    published: 'bg-green-400',
    archived: 'bg-gray-400',
};

export function CalendarWeekView({ entries, allEntries, currentDate, onEntryClick, activeFilter, onFilterChange }: CalendarWeekViewProps) {
    // Calculate week start (Sunday)
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // Generate week days
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        return day;
    });

    // Group entries by date (filtered entries for display)
    const entriesByDate = entries.reduce((acc, entry) => {
        const dateKey = entry.scheduled_date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, CalendarEntry[]>);

    const today = new Date().toISOString().split('T')[0];

    // Count entries by platform (use allEntries if provided for showing all platform badges)
    const entriesForCounting = allEntries || entries;
    const platformCounts = entriesForCounting.reduce((acc, entry) => {
        acc[entry.platform] = (acc[entry.platform] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handlePlatformClick = (platform: string) => {
        if (onFilterChange) {
            if (activeFilter === platform) {
                onFilterChange(undefined); // Clear filter
            } else {
                onFilterChange(platform as Platform);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Week Stats - Clickable Platform Filters */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
                <span className="text-sm font-medium text-muted-foreground">This Week:</span>
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

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-3 min-h-[450px]">
                {weekDays.map((day, index) => {
                    const dateKey = day.toISOString().split('T')[0];
                    const dayEntries = entriesByDate[dateKey] || [];
                    const isToday = dateKey === today;
                    const isPast = dateKey < today;

                    return (
                        <div
                            key={index}
                            className={`flex flex-col rounded-xl overflow-hidden transition-all duration-200 ${isToday
                                ? 'shadow-lg bg-gradient-to-b from-primary/5 to-transparent'
                                : isPast
                                    ? 'bg-muted/30 opacity-75'
                                    : 'bg-card border border-border hover:shadow-md'
                                }`}
                        >
                            {/* Day Header */}
                            <div className={`px-1 py-1 text-center border-b ${isToday
                                ? 'bg-primary/10 text-foreground'
                                : 'bg-muted/50'
                                }`}>
                                <div className="text-[7px] font-medium tracking-wider opacity-70">
                                    {SHORT_DAYS[index]}
                                </div>
                                <div className={`text-xs font-semibold ${isToday ? '' : isPast ? 'text-muted-foreground' : ''
                                    }`}>
                                    {day.getDate()}
                                </div>
                                {dayEntries.length > 0 && (
                                    <div className={`text-[8px] ${isToday ? 'text-primary/70' : 'text-muted-foreground'
                                        }`}>
                                        {dayEntries.length} post{dayEntries.length > 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>

                            {/* Entries */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[350px] scrollbar-thin">
                                {dayEntries.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground">
                                        <div className="text-2xl opacity-30">📅</div>
                                        <div className="text-xs mt-1">No content</div>
                                    </div>
                                ) : (
                                    dayEntries
                                        .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))
                                        .map((entry) => (
                                            <div
                                                key={entry.id}
                                                onClick={() => onEntryClick(entry)}
                                                className="group relative p-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                                                style={{
                                                    backgroundColor: entry.color,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {/* Status indicator dot */}
                                                <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${STATUS_COLORS[entry.status] || 'bg-gray-400'}`} />

                                                {/* Post Type Badge */}
                                                {entry.post_type && (
                                                    <div className="mb-1">
                                                        <span className="text-[10px] text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full capitalize">
                                                            {POST_TYPE_LABELS[entry.post_type as PostType] || entry.post_type}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Title */}
                                                <div className="font-semibold text-white text-xs leading-tight line-clamp-2 pr-3">
                                                    {entry.title}
                                                </div>

                                                {/* Time */}
                                                {entry.scheduled_time && (
                                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/80">
                                                        <Clock className="w-3 h-3" />
                                                        {entry.scheduled_time.slice(0, 5)}
                                                    </div>
                                                )}

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-lg transition-colors" />
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CalendarWeekView;
