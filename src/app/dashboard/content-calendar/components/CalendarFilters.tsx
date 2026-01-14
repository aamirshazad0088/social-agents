'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type {
    CalendarFilters as FilterType,
    Platform,
    ContentType,
    EntryStatus,
    PLATFORM_LABELS,
    CONTENT_TYPE_LABELS,
    STATUS_LABELS,
    CONTENT_TYPE_COLORS
} from '../types';

interface CalendarFiltersProps {
    filters: FilterType;
    onFiltersChange: (filters: FilterType) => void;
    onClose: () => void;
}

const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'twitter', 'tiktok', 'youtube', 'facebook'];
const CONTENT_TYPES: ContentType[] = [
    'educational', 'fun', 'inspirational', 'promotional',
    'interactive', 'brand_related', 'evergreen', 'holiday_themed'
];
const STATUSES: EntryStatus[] = ['draft', 'scheduled', 'published', 'archived'];

const CONTENT_TYPE_COLOR_MAP: Record<ContentType, string> = {
    educational: '#1E3A8A',
    fun: '#059669',
    inspirational: '#D97706',
    promotional: '#DC2626',
    interactive: '#7C3AED',
    brand_related: '#0891B2',
    evergreen: '#65A30D',
    holiday_themed: '#BE185D',
};

export function CalendarFilters({ filters, onFiltersChange, onClose }: CalendarFiltersProps) {
    const handleChange = (key: keyof FilterType, value: string | undefined) => {
        onFiltersChange({
            ...filters,
            [key]: value === 'all' ? undefined : value,
        });
    };

    const clearFilters = () => {
        onFiltersChange({});
    };

    const hasActiveFilters = Object.values(filters).some(Boolean);

    return (
        <Card>
            <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Filter Calendar</h3>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear all
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Platform Filter */}
                    <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select
                            value={filters.platform || 'all'}
                            onValueChange={(v) => handleChange('platform', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All platforms" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All platforms</SelectItem>
                                {PLATFORMS.map((platform) => (
                                    <SelectItem key={platform} value={platform}>
                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Content Type Filter */}
                    <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Select
                            value={filters.content_type || 'all'}
                            onValueChange={(v) => handleChange('content_type', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {CONTENT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: CONTENT_TYPE_COLOR_MAP[type] }}
                                            />
                                            {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(v) => handleChange('status', v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default CalendarFilters;
