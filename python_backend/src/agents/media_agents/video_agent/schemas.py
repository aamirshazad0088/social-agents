"""
Video Agent Schemas
Pydantic models for Google Veo video generation
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field


# Veo model options
VeoModel = Literal[
    "veo-3.1-generate-preview",
    "veo-3.1-fast-preview",
    "veo-3-generate-preview",
    "veo-2-generate-preview"
]

VeoAspectRatio = Literal["16:9", "9:16"]
VeoResolution = Literal["720p", "1080p"]
VeoDuration = Literal[4, 5, 6, 8]
VeoPersonGeneration = Literal["allow_all", "allow_adult", "dont_allow"]


class VideoGenerationRequest(BaseModel):
    """Request for video generation"""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Video generation prompt")
    model: Optional[VeoModel] = Field("veo-3.1-generate-preview", description="Veo model")
    aspectRatio: Optional[VeoAspectRatio] = Field("16:9", description="Aspect ratio")
    duration: Optional[VeoDuration] = Field(8, description="Duration in seconds (4, 5, 6, or 8)")
    resolution: Optional[VeoResolution] = Field("720p", description="Resolution (1080p only for 8s)")
    personGeneration: Optional[VeoPersonGeneration] = Field(None, description="Person generation setting")
    negativePrompt: Optional[str] = Field(None, description="What to avoid in the video")
    seed: Optional[int] = Field(None, description="Seed for reproducibility (Veo 3+ only)")


class VideoGenerationResponse(BaseModel):
    """Response from video generation"""
    success: bool
    operationId: Optional[str] = Field(None, description="Operation ID for polling")
    operationName: Optional[str] = Field(None, description="Full operation name")
    status: Optional[Literal["pending", "processing", "completed", "failed"]] = None
    videoUrl: Optional[str] = Field(None, description="Video URL when completed")
    generatedAt: Optional[int] = None
    generationTime: Optional[int] = None
    error: Optional[str] = None


class VideoStatusResponse(BaseModel):
    """Response from video status check"""
    success: bool
    status: Literal["pending", "processing", "completed", "failed"]
    progress: Optional[float] = Field(None, description="Progress 0-100")
    videoUrl: Optional[str] = Field(None, description="Video URL when completed")
    error: Optional[str] = None


class ImageToVideoRequest(BaseModel):
    """Request for image-to-video generation"""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Video generation prompt")
    imageUrl: str = Field(..., description="Image URL or base64 data URL")
    model: Optional[VeoModel] = Field("veo-3.1-generate-preview", description="Veo model")
    aspectRatio: Optional[VeoAspectRatio] = Field("16:9", description="Aspect ratio")
    duration: Optional[VeoDuration] = Field(8, description="Duration in seconds")


class VideoExtendRequest(BaseModel):
    """Request for video extension"""
    videoUrl: str = Field(..., description="Video URL to extend")
    prompt: str = Field(..., min_length=1, max_length=2000, description="Extension prompt")
    model: Optional[VeoModel] = Field("veo-3.1-generate-preview", description="Veo model")


# Model constants
VEO_MODELS = [
    {"id": "veo-3.1-generate-preview", "name": "Veo 3.1", "description": "Latest, best quality with native audio"},
    {"id": "veo-3.1-fast-preview", "name": "Veo 3.1 Fast", "description": "Faster generation, good quality"},
    {"id": "veo-3-generate-preview", "name": "Veo 3", "description": "High quality video generation"},
    {"id": "veo-2-generate-preview", "name": "Veo 2", "description": "Previous generation model"},
]

VEO_ASPECT_RATIOS = [
    {"id": "16:9", "name": "Landscape (16:9)", "description": "YouTube, standard video"},
    {"id": "9:16", "name": "Portrait (9:16)", "description": "TikTok, Reels, Shorts"},
]

VEO_DURATIONS = [
    {"value": 4, "label": "4 seconds"},
    {"value": 5, "label": "5 seconds"},
    {"value": 6, "label": "6 seconds"},
    {"value": 8, "label": "8 seconds"},
]

# Maximum prompt tokens (rough estimate: 1 token ≈ 4 chars)
VEO_MAX_PROMPT_TOKENS = 480


def validate_resolution_duration(resolution: str, duration: int) -> bool:
    """Validate that 1080p is only used with 8s duration"""
    if resolution == "1080p" and duration != 8:
        return False
    return True
