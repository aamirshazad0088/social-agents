"""
Media API Routes
Endpoints for image, audio, and video generation
"""
import logging
from fastapi import APIRouter, HTTPException

from ...agents.media_agents.image_agent import (
    generate_image,
    generate_image_edit,
    ImageGenerationRequest,
    ImageGenerationResponse,
    ImageEditRequest,
    IMAGE_GENERATION_PRESETS,
)
from ...agents.media_agents.audio_agent import (
    generate_speech,
    generate_music,
    generate_sound_effects,
    get_voices,
    clone_voice,
    TTSRequest,
    TTSResponse,
    MusicRequest,
    MusicResponse,
    SoundEffectsRequest,
    SoundEffectsResponse,
    VoiceCloningRequest,
    VoiceCloningResponse,
    VoicesResponse,
    TTS_MODELS,
    OUTPUT_FORMATS,
)
from ...agents.media_agents.video_agent import (
    generate_video,
    get_video_status,
    generate_image_to_video,
    VideoGenerationRequest,
    VideoGenerationResponse,
    VideoStatusResponse,
    ImageToVideoRequest,
    VEO_MODELS,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["Media Generation"])


# ============================================================================
# IMAGE ENDPOINTS
# ============================================================================

@router.post("/image/generate", response_model=ImageGenerationResponse)
async def api_generate_image(request: ImageGenerationRequest):
    """
    Generate image from text prompt
    
    Supports:
    - gpt-image-1.5: Latest, best quality
    - dall-e-3: High quality with style options
    - dall-e-2: Fast, multiple images
    """
    try:
        logger.info(f"Image generation request: {request.prompt[:50]}...")
        result = await generate_image(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image/edit", response_model=ImageGenerationResponse)
async def api_edit_image(request: ImageEditRequest):
    """
    Edit image with mask (inpainting)
    
    Provide original image, mask, and edit prompt
    """
    try:
        logger.info(f"Image edit request: {request.prompt[:50]}...")
        result = await generate_image_edit(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image edit error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/presets")
async def get_image_presets():
    """Get available image generation presets"""
    return {
        "success": True,
        "presets": {k: v.model_dump() for k, v in IMAGE_GENERATION_PRESETS.items()}
    }


# ============================================================================
# AUDIO ENDPOINTS
# ============================================================================

@router.post("/audio/speech", response_model=TTSResponse)
async def api_generate_speech(request: TTSRequest):
    """
    Generate speech from text using ElevenLabs TTS
    
    Requires voice_id from GET /media/audio/voices
    """
    try:
        logger.info(f"TTS request: {request.text[:50]}...")
        result = await generate_speech(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/music", response_model=MusicResponse)
async def api_generate_music(request: MusicRequest):
    """
    Generate music from text prompt
    
    Duration: 10 seconds to 5 minutes
    """
    try:
        logger.info(f"Music generation: {request.prompt[:50]}...")
        result = await generate_music(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Music generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/sound-effects", response_model=SoundEffectsResponse)
async def api_generate_sound_effects(request: SoundEffectsRequest):
    """
    Generate sound effects from text prompt
    
    Duration: 0.1 to 30 seconds
    """
    try:
        logger.info(f"Sound effects: {request.prompt[:50]}...")
        result = await generate_sound_effects(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sound effects error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio/voices", response_model=VoicesResponse)
async def api_get_voices():
    """Get available ElevenLabs voices"""
    try:
        result = await get_voices()
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get voices error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/clone-voice", response_model=VoiceCloningResponse)
async def api_clone_voice(request: VoiceCloningRequest):
    """
    Clone voice from audio sample (instant voice cloning)
    
    Provide base64-encoded audio sample
    """
    try:
        logger.info(f"Voice cloning: {request.name}")
        result = await clone_voice(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice cloning error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio/models")
async def get_audio_models():
    """Get available TTS models and output formats"""
    return {
        "success": True,
        "models": TTS_MODELS,
        "outputFormats": OUTPUT_FORMATS
    }


# ============================================================================
# VIDEO ENDPOINTS
# ============================================================================

@router.post("/video/generate", response_model=VideoGenerationResponse)
async def api_generate_video(request: VideoGenerationRequest):
    """
    Generate video from text prompt using Google Veo
    
    Returns operation ID for polling. Use GET /video/status/{operation_name}
    to check when video is ready.
    
    Supports:
    - veo-3.1-generate-preview: Latest, best quality with native audio
    - veo-3.1-fast-preview: Faster generation
    """
    try:
        logger.info(f"Video generation: {request.prompt[:50]}...")
        result = await generate_video(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/video/status/{operation_name:path}", response_model=VideoStatusResponse)
async def api_get_video_status(operation_name: str):
    """
    Get status of video generation operation
    
    Poll this endpoint to check if video is ready
    """
    try:
        logger.info(f"Video status check: {operation_name}")
        result = await get_video_status(operation_name)
        
        return result
        
    except Exception as e:
        logger.error(f"Video status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/video/image-to-video", response_model=VideoGenerationResponse)
async def api_image_to_video(request: ImageToVideoRequest):
    """
    Generate video from image using Google Veo
    
    Provide image URL or base64 data URL
    """
    try:
        logger.info(f"Image-to-video: {request.prompt[:50]}...")
        result = await generate_image_to_video(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image-to-video error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/video/models")
async def get_video_models():
    """Get available Veo models"""
    return {
        "success": True,
        "models": VEO_MODELS
    }


# ============================================================================
# INFO ENDPOINT
# ============================================================================

@router.get("/")
async def media_info():
    """Media API information"""
    return {
        "success": True,
        "message": "Media Generation API is operational",
        "version": "1.0.0",
        "services": {
            "image": {
                "models": ["gpt-image-1.5", "dall-e-3", "dall-e-2"],
                "endpoints": ["/image/generate", "/image/edit", "/image/presets"]
            },
            "audio": {
                "features": ["text-to-speech", "music", "sound-effects", "voice-cloning"],
                "endpoints": ["/audio/speech", "/audio/music", "/audio/sound-effects", "/audio/voices"]
            },
            "video": {
                "models": ["veo-3.1-generate-preview", "veo-3.1-fast-preview"],
                "endpoints": ["/video/generate", "/video/status", "/video/image-to-video"]
            }
        }
    }
