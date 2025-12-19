"""
Image Generation Schemas
Pydantic models for OpenAI image generation (gpt-image-1.5, dall-e-3, dall-e-2)
"""
from typing import Optional, Literal, List
from enum import Enum
from pydantic import BaseModel, Field


# Type definitions
ImageSize = Literal[
    "1024x1024", "1536x1024", "1024x1536",  # gpt-image-1.5
    "1792x1024", "1024x1792",  # dall-e-3
    "512x512", "256x256",  # dall-e-2
    "auto"
]
ImageQuality = Literal["low", "medium", "high", "auto", "standard", "hd"]
ImageFormat = Literal["png", "jpeg", "webp"]
ImageBackground = Literal["transparent", "opaque", "auto"]
ImageModel = Literal["gpt-image-1.5", "dall-e-3", "dall-e-2"]


class ImageGenerationOptions(BaseModel):
    """Core image generation options"""
    size: Optional[ImageSize] = Field("1024x1024", description="Image size")
    quality: Optional[ImageQuality] = Field("medium", description="Quality level")
    format: Optional[ImageFormat] = Field("png", description="Output format")
    background: Optional[ImageBackground] = Field("auto", description="Background type")
    output_compression: Optional[int] = Field(80, ge=0, le=100, description="JPEG/WebP compression")
    moderation: Optional[Literal["auto", "low"]] = Field("auto", description="Moderation level")


class ImageGenerationRequest(BaseModel):
    """Request for image generation"""
    prompt: str = Field(..., min_length=1, max_length=4000, description="Image generation prompt")
    model: Optional[ImageModel] = Field("gpt-image-1.5", description="Model to use")
    size: Optional[ImageSize] = Field("1024x1024", description="Image size")
    quality: Optional[ImageQuality] = Field("medium", description="Quality level")
    format: Optional[ImageFormat] = Field("png", description="Output format")
    background: Optional[ImageBackground] = Field("auto", description="Background type")
    style: Optional[Literal["vivid", "natural"]] = Field(None, description="Style for dall-e-3")
    n: Optional[int] = Field(1, ge=1, le=10, description="Number of images (dall-e-2 only)")


class ImageGenerationMetadata(BaseModel):
    """Metadata about generated image"""
    model: str
    promptUsed: str
    revisedPrompt: Optional[str] = None
    size: Optional[str] = None
    quality: Optional[str] = None
    format: Optional[str] = None


class ImageGenerationResponse(BaseModel):
    """Response from image generation"""
    success: bool
    imageUrl: Optional[str] = Field(None, description="Data URL of generated image")
    metadata: Optional[ImageGenerationMetadata] = None
    generatedAt: Optional[int] = None
    generationTime: Optional[int] = Field(None, description="Generation time in ms")
    error: Optional[str] = None


class ImageEditRequest(BaseModel):
    """Request for image editing with mask"""
    originalImageUrl: str = Field(..., description="Original image (URL or base64 data URL)")
    maskImageUrl: str = Field(..., description="Mask image (URL or base64 data URL)")
    prompt: str = Field(..., min_length=1, max_length=4000, description="Edit prompt")
    model: Optional[ImageModel] = Field("gpt-image-1.5", description="Model to use")
    size: Optional[ImageSize] = Field("1024x1024", description="Output size")


class ImagePreset(BaseModel):
    """Preset configuration for image generation"""
    id: str
    name: str
    description: str
    icon: str
    size: ImageSize
    quality: ImageQuality
    format: ImageFormat
    background: ImageBackground
    category: Literal["platform", "quality", "style"]


# Built-in presets for different platforms
IMAGE_GENERATION_PRESETS = {
    "instagram": ImagePreset(
        id="instagram", name="Instagram Post", description="Square format, vibrant colors",
        icon="📸", size="1024x1024", quality="medium", format="png", background="auto", category="platform"
    ),
    "twitter": ImagePreset(
        id="twitter", name="Twitter/X", description="Landscape, optimized for feed",
        icon="🐦", size="1536x1024", quality="medium", format="jpeg", background="auto", category="platform"
    ),
    "story": ImagePreset(
        id="story", name="Instagram Story", description="Vertical format for stories",
        icon="📱", size="1024x1536", quality="high", format="png", background="auto", category="platform"
    ),
    "linkedin": ImagePreset(
        id="linkedin", name="LinkedIn", description="Professional, corporate style",
        icon="💼", size="1024x1024", quality="high", format="png", background="auto", category="platform"
    ),
    "facebook": ImagePreset(
        id="facebook", name="Facebook", description="Landscape format for Facebook posts",
        icon="📘", size="1536x1024", quality="medium", format="jpeg", background="auto", category="platform"
    ),
    "tiktok": ImagePreset(
        id="tiktok", name="TikTok", description="Vertical format for TikTok",
        icon="🎵", size="1024x1536", quality="high", format="png", background="auto", category="platform"
    ),
    "youtube": ImagePreset(
        id="youtube", name="YouTube Thumbnail", description="Landscape for thumbnails",
        icon="📺", size="1536x1024", quality="high", format="jpeg", background="auto", category="platform"
    ),
    "fast": ImagePreset(
        id="fast", name="Fast Generation", description="Quick preview quality",
        icon="⚡", size="1024x1024", quality="low", format="jpeg", background="auto", category="quality"
    ),
    "premium": ImagePreset(
        id="premium", name="Premium Quality", description="Best quality, transparent",
        icon="💎", size="1024x1024", quality="high", format="png", background="transparent", category="quality"
    ),
    "product": ImagePreset(
        id="product", name="Product Photo", description="Clean background, high quality",
        icon="📦", size="1024x1024", quality="high", format="png", background="transparent", category="style"
    ),
}


def get_preset_for_platform(platform: str) -> ImageGenerationOptions:
    """Get optimal image generation settings for a platform"""
    platform_lower = platform.lower()
    preset = IMAGE_GENERATION_PRESETS.get(platform_lower)
    
    if preset:
        return ImageGenerationOptions(
            size=preset.size,
            quality=preset.quality,
            format=preset.format,
            background=preset.background
        )
    
    # Default fallback
    return ImageGenerationOptions(
        size="1024x1024",
        quality="medium",
        format="png",
        background="auto"
    )
