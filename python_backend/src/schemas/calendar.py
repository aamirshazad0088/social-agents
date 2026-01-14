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


class EntryStatus(str, Enum):
    """Calendar entry status."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# Color mapping for content types
CONTENT_TYPE_COLORS = {
    ContentType.EDUCATIONAL: "#1E3A8A",
    ContentType.FUN: "#059669",
    ContentType.INSPIRATIONAL: "#D97706",
    ContentType.PROMOTIONAL: "#DC2626",
    ContentType.INTERACTIVE: "#7C3AED",
    ContentType.BRAND_RELATED: "#0891B2",
    ContentType.EVERGREEN: "#65A30D",
    ContentType.HOLIDAY_THEMED: "#BE185D",
}


class CalendarEntryBase(BaseModel):
    """Base model for calendar entry."""
    scheduled_date: date
    scheduled_time: Optional[time] = None
    platform: Platform
    content_type: ContentType
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
