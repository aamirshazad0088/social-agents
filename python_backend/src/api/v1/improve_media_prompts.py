"""
Improvement API Routes
Content and prompt improvement endpoints
"""
import logging
from fastapi import APIRouter, HTTPException

from ...agents.content_improvement_agent import (
    improve_content_description,
    ImproveContentRequest,
    ImproveContentResponse
)
from ...agents.media_prompt_agent import (
    improve_media_prompt,
    ImprovePromptRequest,
    ImprovePromptResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/improve", tags=["improvement"])


@router.post("/content", response_model=ImproveContentResponse)
async def improve_content(request_body: ImproveContentRequest):
    """
    POST /api/v1/improve/content
    
    Improve social media content description using AI.
    
    Optimizes content for specific platforms with:
    - Platform-specific best practices
    - Character limit compliance
    - Hashtag optimization
    - Emoji usage (when appropriate)
    - Call-to-action integration
    - Engagement optimization
    
    Args:
        request_body: Content improvement request
        
    Returns:
        Improved content description
        
    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    try:
        logger.info(f"Content improvement request for {request_body.platform}")
        
        result = await improve_content_description(request_body)
        
        logger.info(f"Content improved successfully for {request_body.platform}")
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "Validation error",
                "message": str(e)
            }
        )
    
    except Exception as e:
        logger.error(f"Content improvement error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": str(e)
            }
        )


@router.post("/prompt", response_model=ImprovePromptResponse)
async def improve_prompt(request_body: ImprovePromptRequest):
    """
    POST /api/v1/improve/prompt
    
    Improve AI generation prompts for images and videos.
    
    Enhances prompts with:
    - Technical details (lighting, composition, camera)
    - Style and aesthetic direction
    - Quality modifiers
    - Provider-specific optimizations
    - Aspect ratio specifications
    - Motion and pacing (for video)
    
    Args:
        request_body: Prompt improvement request
        
    Returns:
        Improved AI generation prompt
        
    Raises:
        HTTPException: 400 for validation errors, 500 for server errors
    """
    try:
        logger.info(f"Prompt improvement request for {request_body.mediaType}")
        
        result = await improve_media_prompt(request_body)
        
        logger.info(f"Prompt improved successfully for {request_body.mediaType}")
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "Validation error",
                "message": str(e)
            }
        )
    
    except Exception as e:
        logger.error(f"Prompt improvement error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": str(e)
            }
        )


@router.get("/content")
async def content_improvement_info():
    """GET /api/v1/improve/content - Service information"""
    return {
        "success": True,
        "message": "Content Improvement API is operational",
        "version": "1.0.0",
        "supportedPlatforms": ["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"],
        "supportedPostTypes": ["post", "feed", "carousel", "reel", "story", "video", "short", "slideshow"]
    }


@router.get("/prompt")
async def prompt_improvement_info():
    """GET /api/v1/improve/prompt - Service information"""
    return {
        "success": True,
        "message": "Media Prompt Improvement API is operational",
        "version": "1.0.0",
        "supportedMediaTypes": ["image-generation", "image-editing", "video-generation", "video-editing"],
        "supportedProviders": ["openai", "midjourney", "runway", "veo", "imagen", "stable-diffusion"]
    }
