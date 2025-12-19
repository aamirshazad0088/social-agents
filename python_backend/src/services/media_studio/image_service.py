"""
Image Processing Service
Uses Pillow for high-quality image resizing with platform presets
"""

import io
import httpx
from PIL import Image
from typing import Literal, Optional
from dataclasses import dataclass


# Platform aspect ratio presets - 2025 Official Standards
PLATFORM_PRESETS = {
    # Vertical (9:16) - Stories and Reels covers
    "instagram-story": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Instagram Story"},
    "facebook-story": {"width": 1080, "height": 1920, "aspect_ratio": "9:16", "name": "Facebook Story"},
    
    # Square (1:1) - Feed posts
    "instagram-post": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "Instagram Post (Square)"},
    "facebook-post-square": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "Facebook Post (Square)"},
    "linkedin-square": {"width": 1080, "height": 1080, "aspect_ratio": "1:1", "name": "LinkedIn (Square)"},
    
    # Portrait (4:5) - Optimized for mobile feed
    "instagram-feed": {"width": 1080, "height": 1350, "aspect_ratio": "4:5", "name": "Instagram Feed (4:5)"},
    "facebook-feed": {"width": 1080, "height": 1350, "aspect_ratio": "4:5", "name": "Facebook Feed (4:5)"},
    
    # Landscape - Cover photos and headers
    "youtube-thumbnail": {"width": 1280, "height": 720, "aspect_ratio": "16:9", "name": "YouTube Thumbnail"},
    "facebook-cover": {"width": 1640, "height": 924, "aspect_ratio": "16:9", "name": "Facebook Cover"},
    "twitter-header": {"width": 1500, "height": 500, "aspect_ratio": "3:1", "name": "Twitter/X Header"},
    "linkedin-cover": {"width": 1584, "height": 396, "aspect_ratio": "4:1", "name": "LinkedIn Cover"},
}


@dataclass
class ResizeResult:
    """Result of image resize operation"""
    buffer: bytes
    format: Literal["jpeg", "png"]
    original_width: int
    original_height: int
    width: int
    height: int
    file_size: int


class ImageService:
    """Image processing service using Pillow"""
    
    @staticmethod
    def get_presets() -> list[dict]:
        """Get all available platform presets"""
        return [
            {"id": key, **value}
            for key, value in PLATFORM_PRESETS.items()
        ]
    
    @staticmethod
    def get_preset(platform: str) -> Optional[dict]:
        """Get a specific platform preset"""
        return PLATFORM_PRESETS.get(platform)
    
    @staticmethod
    async def download_image(url: str) -> bytes:
        """Download image from URL"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError(f"Failed to download image: HTTP {response.status_code}")
            return response.content
    
    @staticmethod
    def resize_image(
        image_data: bytes,
        target_width: int,
        target_height: int
    ) -> ResizeResult:
        """
        Resize image to target dimensions with high quality settings.
        Uses cover fit (fill frame and crop excess) to avoid black bars.
        
        - Uses JPEG for photos (smaller file size, 95 quality)
        - Uses PNG for images with transparency
        - Uses LANCZOS resampling for best quality
        """
        # Open image
        img = Image.open(io.BytesIO(image_data))
        original_width, original_height = img.size
        
        # Check for transparency (alpha channel)
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        
        # Decide output format
        output_format: Literal["jpeg", "png"] = "png" if has_alpha else "jpeg"
        
        # Convert to appropriate mode for processing
        if has_alpha:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        
        # Calculate crop dimensions for "cover" fit
        # Scale to fill the target area, then center crop
        source_ratio = original_width / original_height
        target_ratio = target_width / target_height
        
        if source_ratio > target_ratio:
            # Image is wider than target - scale by height, crop width
            new_height = target_height
            new_width = int(original_width * (target_height / original_height))
        else:
            # Image is taller than target - scale by width, crop height
            new_width = target_width
            new_height = int(original_height * (target_width / original_width))
        
        # Resize with LANCZOS for best quality
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center crop to exact target dimensions
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        
        img = img.crop((left, top, right, bottom))
        
        # Save to buffer with high quality settings
        output_buffer = io.BytesIO()
        
        if output_format == "jpeg":
            # High quality JPEG with optimized settings
            img.save(
                output_buffer,
                format="JPEG",
                quality=95,
                optimize=True,
                progressive=True
            )
        else:
            # PNG with balanced compression
            img.save(
                output_buffer,
                format="PNG",
                optimize=True
            )
        
        output_bytes = output_buffer.getvalue()
        
        return ResizeResult(
            buffer=output_bytes,
            format=output_format,
            original_width=original_width,
            original_height=original_height,
            width=target_width,
            height=target_height,
            file_size=len(output_bytes)
        )
    
    @classmethod
    async def resize_for_platform(
        cls,
        image_url: str,
        platform: Optional[str] = None,
        custom_width: Optional[int] = None,
        custom_height: Optional[int] = None
    ) -> tuple[ResizeResult, str]:
        """
        Resize image for a specific platform or custom dimensions.
        Returns tuple of (result, platform_name)
        """
        # Get target dimensions
        if platform and platform in PLATFORM_PRESETS:
            preset = PLATFORM_PRESETS[platform]
            target_width = preset["width"]
            target_height = preset["height"]
            platform_name = preset["name"]
        elif custom_width and custom_height:
            target_width = custom_width
            target_height = custom_height
            platform_name = f"Custom ({custom_width}x{custom_height})"
        else:
            raise ValueError("Either platform or custom dimensions required")
        
        # Download image
        image_data = await cls.download_image(image_url)
        
        # Resize image
        result = cls.resize_image(image_data, target_width, target_height)
        
        return result, platform_name
