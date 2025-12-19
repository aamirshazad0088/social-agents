"""
Image Generation Service
Production implementation using OpenAI Images API
Supports: gpt-image-1.5, dall-e-3, dall-e-2
"""
import logging
import time
import base64
import httpx
from typing import Optional

from openai import AsyncOpenAI

from .schemas import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImageGenerationMetadata,
    ImageEditRequest,
)
from ....config import settings

logger = logging.getLogger(__name__)

# Lazy client initialization
_openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create async OpenAI client"""
    global _openai_client
    
    if _openai_client is None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        _openai_client = AsyncOpenAI(api_key=api_key)
    
    return _openai_client


def build_request_params(request: ImageGenerationRequest) -> dict:
    """
    Build request parameters for OpenAI Images API
    Handles model-specific parameter differences
    """
    model = request.model or "gpt-image-1.5"
    
    params = {
        "model": model,
        "prompt": request.prompt,
        "response_format": "b64_json",  # Always get base64 for data URL
    }
    
    # Size handling
    if request.size and request.size != "auto":
        params["size"] = request.size
    else:
        params["size"] = "1024x1024"
    
    # Model-specific parameters
    if model == "gpt-image-1.5":
        if request.quality and request.quality not in ["auto", "standard", "hd"]:
            params["quality"] = request.quality
        if request.background and request.background != "auto":
            params["background"] = request.background
    
    elif model == "dall-e-3":
        # Map quality to dall-e-3 values
        if request.quality:
            params["quality"] = "hd" if request.quality == "high" else "standard"
        if request.style:
            params["style"] = request.style
        # dall-e-3 only supports n=1
    
    elif model == "dall-e-2":
        if request.n and request.n > 1:
            params["n"] = min(request.n, 10)
    
    return params


def base64_to_data_url(b64_data: str, format: str = "png") -> str:
    """Convert base64 to data URL"""
    return f"data:image/{format};base64,{b64_data}"


async def generate_image(request: ImageGenerationRequest) -> ImageGenerationResponse:
    """
    Generate image using OpenAI Images API
    
    Supports:
    - gpt-image-1.5: Latest model with best quality
    - dall-e-3: High quality with style options
    - dall-e-2: Fast, supports multiple images
    
    Args:
        request: Image generation request
        
    Returns:
        ImageGenerationResponse with data URL or error
    """
    start_time = time.time()
    
    try:
        client = get_openai_client()
        params = build_request_params(request)
        
        logger.info(f"Generating image with model={params.get('model')}, size={params.get('size')}")
        
        response = await client.images.generate(**params)
        
        if not response.data or len(response.data) == 0:
            return ImageGenerationResponse(
                success=False,
                error="No image data received from API"
            )
        
        image_data = response.data[0]
        b64_image = image_data.b64_json
        
        if not b64_image:
            return ImageGenerationResponse(
                success=False,
                error="No base64 data in response"
            )
        
        # Convert to data URL
        output_format = request.format or "png"
        image_url = base64_to_data_url(b64_image, output_format)
        
        generation_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Image generated successfully in {generation_time}ms")
        
        return ImageGenerationResponse(
            success=True,
            imageUrl=image_url,
            metadata=ImageGenerationMetadata(
                model=request.model or "gpt-image-1.5",
                promptUsed=request.prompt,
                revisedPrompt=getattr(image_data, "revised_prompt", None),
                size=request.size,
                quality=request.quality,
                format=output_format
            ),
            generatedAt=int(time.time() * 1000),
            generationTime=generation_time
        )
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return ImageGenerationResponse(
            success=False,
            error=str(e)
        )
    
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        
        error_msg = str(e)
        if "api_key" in error_msg.lower():
            error_msg = "Invalid API key"
        elif "rate_limit" in error_msg.lower():
            error_msg = "Rate limit exceeded"
        
        return ImageGenerationResponse(
            success=False,
            error=error_msg
        )


async def generate_image_edit(request: ImageEditRequest) -> ImageGenerationResponse:
    """
    Edit image with mask (inpainting)
    
    Uses OpenAI images.edit() endpoint to modify specific areas
    of an image based on a mask.
    
    Args:
        request: Image edit request with original image, mask, and prompt
        
    Returns:
        ImageGenerationResponse with edited image or error
    """
    start_time = time.time()
    
    try:
        client = get_openai_client()
        
        logger.info(f"Editing image with prompt: {request.prompt[:50]}...")
        
        # Helper to convert URL to bytes
        async def url_to_bytes(url: str) -> tuple[bytes, str]:
            """Convert URL or data URL to bytes and detect mime type"""
            if url.startswith("data:"):
                # Parse data URL
                header, b64_data = url.split(",", 1)
                mime_match = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
                return base64.b64decode(b64_data), mime_match
            else:
                # Fetch from HTTP URL
                async with httpx.AsyncClient() as http_client:
                    response = await http_client.get(url)
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "image/png")
                    return response.content, content_type
        
        # Get image and mask bytes
        image_bytes, image_mime = await url_to_bytes(request.originalImageUrl)
        mask_bytes, mask_mime = await url_to_bytes(request.maskImageUrl)
        
        # Call OpenAI edit API
        response = await client.images.edit(
            model=request.model or "gpt-image-1.5",
            image=image_bytes,
            mask=mask_bytes,
            prompt=request.prompt,
            response_format="b64_json",
            size=request.size or "1024x1024"
        )
        
        if not response.data or len(response.data) == 0:
            return ImageGenerationResponse(
                success=False,
                error="No edited image data received"
            )
        
        b64_image = response.data[0].b64_json
        
        if not b64_image:
            return ImageGenerationResponse(
                success=False,
                error="No base64 data in edit response"
            )
        
        image_url = base64_to_data_url(b64_image, "png")
        generation_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Image edited successfully in {generation_time}ms")
        
        return ImageGenerationResponse(
            success=True,
            imageUrl=image_url,
            metadata=ImageGenerationMetadata(
                model=request.model or "gpt-image-1.5",
                promptUsed=request.prompt,
                size=request.size
            ),
            generatedAt=int(time.time() * 1000),
            generationTime=generation_time
        )
        
    except Exception as e:
        logger.error(f"Image edit error: {e}", exc_info=True)
        return ImageGenerationResponse(
            success=False,
            error=str(e)
        )
