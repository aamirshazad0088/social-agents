"""
Sora Agent Schemas
OpenAI Video Generation API (Sora 2) - Production Implementation
Per latest OpenAI Video API documentation
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field


# Model options per OpenAI docs
SoraModel = Literal["sora-2", "sora-2-pro"]

# Size options per OpenAI docs - only 4 sizes supported
SoraSize = Literal[
    "1280x720",    # HD 16:9 Landscape
    "720x1280",    # HD 9:16 Portrait
    "1792x1024",   # Wide 16:9 Landscape
    "1024x1792",   # Tall 9:16 Portrait
]

# Video job status per OpenAI docs
SoraStatus = Literal["queued", "in_progress", "completed", "failed"]


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class SoraGenerateRequest(BaseModel):
    """
    Text-to-video generation request
    POST /videos
    """
    prompt: str = Field(..., min_length=1, max_length=5000, description="Video description")
    model: Optional[SoraModel] = Field("sora-2", description="sora-2 (fast) or sora-2-pro (quality)")
    size: Optional[SoraSize] = Field("720x1280", description="Video resolution")
    seconds: Optional[str] = Field("4", description="Duration: 4 (default), 8, or 12 seconds")


class SoraImageToVideoRequest(BaseModel):
    """
    Image-to-video generation request (image as first frame)
    POST /videos with input_reference
    """
    prompt: str = Field(..., min_length=1, max_length=5000, description="Video description")
    imageUrl: str = Field(..., description="Image URL or base64 data URL (first frame)")
    model: Optional[SoraModel] = Field("sora-2", description="Model to use")
    size: Optional[SoraSize] = Field("720x1280", description="Video resolution (must match image)")
    seconds: Optional[str] = Field("4", description="Duration: 4 (default), 8, or 12 seconds")


class SoraRemixRequest(BaseModel):
    """
    Remix completed video request
    POST /videos/{id}/remix
    """
    previousVideoId: str = Field(..., description="ID of completed video to remix")
    prompt: str = Field(..., min_length=1, max_length=5000, description="Description of changes")


class SoraStatusRequest(BaseModel):
    """Request to check video status"""
    videoId: str = Field(..., description="Video job ID")


class SoraFetchRequest(BaseModel):
    """Request to fetch completed video"""
    videoId: str = Field(..., description="Video job ID")
    variant: Optional[Literal["video", "thumbnail", "spritesheet"]] = Field("video")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class SoraVideoData(BaseModel):
    """Video job data from OpenAI"""
    id: str
    status: SoraStatus
    model: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    size: Optional[str] = None
    seconds: Optional[str] = None
    created_at: Optional[int] = None


class SoraGenerateResponse(BaseModel):
    """Response from video generation start"""
    success: bool
    videoId: Optional[str] = None
    status: Optional[SoraStatus] = None
    data: Optional[SoraVideoData] = None
    error: Optional[str] = None


class SoraStatusResponse(BaseModel):
    """Response from status check"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


class SoraFetchResponse(BaseModel):
    """Response from video fetch"""
    success: bool
    data: Optional[dict] = None
    videoUrl: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# CONSTANTS
# ============================================================================

SORA_MODELS = [
    {
        "id": "sora-2",
        "name": "Sora 2",
        "description": "Speed & flexibility for rapid iteration",
        "estimatedTime": "1-3 minutes"
    },
    {
        "id": "sora-2-pro",
        "name": "Sora 2 Pro",
        "description": "Production-quality cinematic output",
        "estimatedTime": "3-5 minutes"
    },
]

SORA_SIZES = [
    {"value": "1280x720", "label": "HD Landscape", "aspect": "16:9"},
    {"value": "720x1280", "label": "HD Portrait", "aspect": "9:16"},
    {"value": "1792x1024", "label": "Wide Landscape", "aspect": "16:9"},
    {"value": "1024x1792", "label": "Tall Portrait", "aspect": "9:16"},
]

SORA_DURATIONS = [
    {"value": "4", "label": "4 seconds (default)"},
    {"value": "8", "label": "8 seconds"},
    {"value": "12", "label": "12 seconds (maximum)"},
]
