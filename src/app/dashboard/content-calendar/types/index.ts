// Content Calendar Types

export type Platform = 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'youtube' | 'facebook';

export type ContentType =
    | 'educational'
    | 'fun'
    | 'inspirational'
    | 'promotional'
    | 'interactive'
    | 'brand_related'
    | 'evergreen'
    | 'holiday_themed';

export type EntryStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface CalendarEntry {
    id: string;
    workspace_id: string;
    created_by?: string;
    scheduled_date: string;
    scheduled_time?: string;
    platform: Platform;
    content_type: ContentType;
    title: string;
    content?: string;
    hashtags?: string[];
    image_prompt?: string;
    image_url?: string;
    video_script?: string;
    video_url?: string;
    notes?: string;
    status: EntryStatus;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface CalendarFilters {
    platform?: Platform;
    content_type?: ContentType;
    status?: EntryStatus;
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
    educational: '#1E3A8A',
    fun: '#059669',
    inspirational: '#D97706',
    promotional: '#DC2626',
    interactive: '#7C3AED',
    brand_related: '#0891B2',
    evergreen: '#65A30D',
    holiday_themed: '#BE185D',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    educational: 'Educational',
    fun: 'Fun',
    inspirational: 'Inspirational',
    promotional: 'Promotional',
    interactive: 'Interactive',
    brand_related: 'Brand-Related',
    evergreen: 'Evergreen',
    holiday_themed: 'Holiday-Themed',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    facebook: 'Facebook',
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
    archived: 'Archived',
};
