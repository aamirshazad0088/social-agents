"""
Content Calendar API - Schemas
Pydantic models for calendar entry requests and responses.
"""
from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class Platform(str, Enum):
    """Supported social media platforms."""
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"


class ContentType(str, Enum):
    """Content type categories with associated colors."""
    EDUCATIONAL = "educational"
    FUN = "fun"
    INSPIRATIONAL = "inspirational"
    PROMOTIONAL = "promotional"
    INTERACTIVE = "interactive"
    BRAND_RELATED = "brand_related"
    EVERGREEN = "evergreen"
    HOLIDAY_THEMED = "holiday_themed"


class PostType(str, Enum):
    """Platform-specific post types."""
    # Common
    POST = "post"
    VIDEO = "video"
    LIVE = "live"
    POLL = "poll"
    # Instagram
    REEL = "reel"
    STORY = "story"
    CAROUSEL = "carousel"
    # Twitter/X
    TEXT = "text"
    IMAGE = "image"
    THREAD = "thread"
    # LinkedIn
    ARTICLE = "article"
    DOCUMENT = "document"
    # YouTube
    SHORT = "short"
    PREMIERE = "premiere"
    # TikTok
    DUET = "duet"
    STITCH = "stitch"
    # Facebook
    EVENT = "event"
    # Pinterest
    PIN = "pin"
    IDEA_PIN = "idea_pin"
    VIDEO_PIN = "video_pin"


# Platform-specific post types mapping
POST_TYPES_BY_PLATFORM = {
    "instagram": ["post", "reel", "story", "carousel", "live"],
    "twitter": ["text", "image", "video", "thread", "poll"],
    "linkedin": ["post", "article", "carousel", "document", "poll"],
    "youtube": ["video", "short", "premiere", "live"],
    "tiktok": ["video", "duet", "stitch", "live"],
    "facebook": ["post", "reel", "story", "event", "live"],
    "pinterest": ["pin", "idea_pin", "video_pin"],
}


class EntryStatus(str, Enum):
    """Calendar entry status."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# Color mapping for content types (modern, professional palette)
CONTENT_TYPE_COLORS = {
    ContentType.EDUCATIONAL: "#6366F1",    # Indigo
    ContentType.FUN: "#10B981",            # Emerald
    ContentType.INSPIRATIONAL: "#F59E0B",  # Amber
    ContentType.PROMOTIONAL: "#F97316",    # Orange
    ContentType.INTERACTIVE: "#8B5CF6",    # Violet
    ContentType.BRAND_RELATED: "#06B6D4",  # Cyan
    ContentType.EVERGREEN: "#22C55E",      # Green
    ContentType.HOLIDAY_THEMED: "#EC4899", # Pink
}


class CalendarEntryBase(BaseModel):
    """Base model for calendar entry."""
    scheduled_date: date
    scheduled_time: Optional[time] = None
    platform: Platform
    content_type: ContentType
    post_type: Optional[str] = Field(default="post", description="Platform-specific post type")
    title: str = Field(..., max_length=200)
    content: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None
    video_script: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: EntryStatus = EntryStatus.DRAFT


class CalendarEntryCreate(CalendarEntryBase):
    """Request model for creating a calendar entry."""
    pass


class CalendarEntryUpdate(BaseModel):
    """Request model for updating a calendar entry."""
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    platform: Optional[Platform] = None
    content_type: Optional[ContentType] = None
    post_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None
    video_script: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[EntryStatus] = None


class CalendarEntry(CalendarEntryBase):
    """Response model for a calendar entry."""
    id: str
    workspace_id: str
    created_by: Optional[str] = None
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalendarWeekView(BaseModel):
    """Response model for week view."""
    week_start: date
    week_end: date
    entries: List[CalendarEntry]


class CalendarMonthView(BaseModel):
    """Response model for month view."""
    year: int
    month: int
    entries: List[CalendarEntry]
