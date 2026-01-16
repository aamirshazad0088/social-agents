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

export type PostType =
    | 'post'
    | 'reel'
    | 'story'
    | 'carousel'
    | 'live'
    | 'text'
    | 'image'
    | 'video'
    | 'thread'
    | 'poll'
    | 'article'
    | 'document'
    | 'short'
    | 'premiere'
    | 'duet'
    | 'stitch'
    | 'event'
    | 'pin'
    | 'idea_pin'
    | 'video_pin';

export type EntryStatus = 'draft' | 'scheduled' | 'published' | 'archived';

// Platform-specific post types
export const POST_TYPES_BY_PLATFORM: Record<Platform, PostType[]> = {
    instagram: ['post', 'reel', 'story', 'carousel', 'live'],
    twitter: ['text', 'image', 'video', 'thread', 'poll'],
    linkedin: ['post', 'article', 'carousel', 'document', 'poll'],
    youtube: ['video', 'short', 'premiere', 'live'],
    tiktok: ['video', 'duet', 'stitch', 'live'],
    facebook: ['post', 'reel', 'story', 'event', 'live'],
};

export interface CalendarEntry {
    id: string;
    workspace_id: string;
    created_by?: string;
    scheduled_date: string;
    scheduled_time?: string;
    platform: Platform;
    content_type: ContentType;
    post_type?: PostType;
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
    post_type?: PostType;
    status?: EntryStatus;
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
    educational: '#6366F1',    // Indigo - calm, professional
    fun: '#10B981',            // Emerald - fresh, lively
    inspirational: '#F59E0B',  // Amber - warm, motivating
    promotional: '#F97316',    // Orange - attention-grabbing, warm
    interactive: '#8B5CF6',    // Violet - creative, engaging
    brand_related: '#06B6D4',  // Cyan - modern, tech-savvy
    evergreen: '#22C55E',      // Green - nature, growth
    holiday_themed: '#EC4899', // Pink - festive, cheerful
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

export const POST_TYPE_LABELS: Record<PostType, string> = {
    post: 'Post',
    reel: 'Reel',
    story: 'Story',
    carousel: 'Carousel',
    live: 'Live',
    text: 'Text',
    image: 'Image',
    video: 'Video',
    thread: 'Thread',
    poll: 'Poll',
    article: 'Article',
    document: 'Document',
    short: 'Short',
    premiere: 'Premiere',
    duet: 'Duet',
    stitch: 'Stitch',
    event: 'Event',
    pin: 'Pin',
    idea_pin: 'Idea Pin',
    video_pin: 'Video Pin',
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
    archived: 'Archived',
};
