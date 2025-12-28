"""
Audio Generation Service
Production implementation using ElevenLabs API
Supports: TTS, Music, Sound Effects, Voice Cloning, Voice Design, Dialog
"""
import logging
import time
import base64
import httpx
from typing import Optional, List

from .schemas import (
    TTSRequest,
    TTSResponse,
    MusicRequest,
    MusicResponse,
    SoundEffectsRequest,
    SoundEffectsResponse,
    VoiceCloningRequest,
    VoiceCloningResponse,
    VoiceDesignRequest,
    VoiceDesignResponse,
    VoiceDesignPreview,
    DialogRequest,
    DialogResponse,
    DialogInput,
    Voice,
    VoicesResponse,
)
from ....config import settings

logger = logging.getLogger(__name__)

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


def get_api_key() -> str:
    """Get ElevenLabs API key"""
    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY is not configured")
    return api_key


def audio_to_data_url(audio_bytes: bytes, format: str = "mp3") -> str:
    """Convert audio bytes to data URL"""
    b64 = base64.b64encode(audio_bytes).decode("utf-8")
    return f"data:audio/{format};base64,{b64}"


# ============================================================================
# Text-to-Speech
# ============================================================================

async def generate_speech(request: TTSRequest) -> TTSResponse:
    """
    Generate speech from text using ElevenLabs TTS API
    
    Supports multiple models:
    - eleven_v3: Most expressive
    - eleven_multilingual_v2: 70+ languages
    - eleven_turbo_v2_5: Fast, balanced
    - eleven_flash_v2_5: Ultra-low latency
    
    Args:
        request: TTS request with text and voice settings
        
    Returns:
        TTSResponse with audio data or error
    """
    start_time = time.time()
    
    try:
        api_key = get_api_key()
        
        # Build request body
        body = {
            "text": request.text,
            "model_id": request.modelId or "eleven_multilingual_v2",
        }
        
        # Add voice settings
        if request.voiceSettings:
            body["voice_settings"] = {
                "stability": request.voiceSettings.stability,
                "similarity_boost": request.voiceSettings.similarity_boost,
            }
            if request.voiceSettings.style is not None:
                body["voice_settings"]["style"] = request.voiceSettings.style
            if request.voiceSettings.use_speaker_boost is not None:
                body["voice_settings"]["use_speaker_boost"] = request.voiceSettings.use_speaker_boost
        else:
            body["voice_settings"] = {
                "stability": 0.5,
                "similarity_boost": 0.75,
            }
        
        url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{request.voiceId}"
        
        # Add output format as query param
        params = {}
        if request.outputFormat:
            params["output_format"] = request.outputFormat
        
        logger.info(f"Generating speech with voice={request.voiceId}, model={body['model_id']}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                params=params,
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"ElevenLabs API error: {response.status_code} - {error_text}")
                return TTSResponse(
                    success=False,
                    error=f"ElevenLabs API error: {response.status_code}"
                )
            
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            # Determine audio format from output_format
            audio_format = "mp3"
            if request.outputFormat and "pcm" in request.outputFormat:
                audio_format = "wav"
            
            generation_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Speech generated successfully in {generation_time}ms")
            
            return TTSResponse(
                success=True,
                audioBase64=audio_base64,
                audioUrl=audio_to_data_url(audio_bytes, audio_format),
                generationTime=generation_time
            )
            
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        return TTSResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        return TTSResponse(success=False, error=str(e))


# ============================================================================
# Music Generation
# ============================================================================

async def generate_music(request: MusicRequest) -> MusicResponse:
    """
    Generate music using ElevenLabs Music API
    
    Args:
        request: Music generation request with prompt and duration
        
    Returns:
        MusicResponse with audio data or error
    """
    start_time = time.time()
    
    try:
        api_key = get_api_key()
        
        body = {
            "prompt": request.prompt,
            "duration_seconds": round(request.durationMs / 1000),
        }
        
        logger.info(f"Generating music: {request.prompt[:50]}...")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/music/generate",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Music generation error: {response.status_code} - {error_text}")
                return MusicResponse(
                    success=False,
                    error=f"Music generation failed: {response.status_code}"
                )
            
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            generation_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Music generated in {generation_time}ms")
            
            return MusicResponse(
                success=True,
                audioBase64=audio_base64,
                audioUrl=audio_to_data_url(audio_bytes, "mp3"),
                generationTime=generation_time
            )
            
    except ValueError as e:
        return MusicResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Music generation error: {e}", exc_info=True)
        return MusicResponse(success=False, error=str(e))


# ============================================================================
# Sound Effects Generation
# ============================================================================

async def generate_sound_effects(request: SoundEffectsRequest) -> SoundEffectsResponse:
    """
    Generate sound effects using ElevenLabs Sound Generation API
    
    Args:
        request: Sound effects request with prompt
        
    Returns:
        SoundEffectsResponse with audio data or error
    """
    start_time = time.time()
    
    try:
        api_key = get_api_key()
        
        body = {
            "text": request.prompt,
        }
        
        if request.durationSeconds is not None:
            body["duration_seconds"] = request.durationSeconds
        
        if request.promptInfluence is not None:
            body["prompt_influence"] = request.promptInfluence
        
        if request.loop:
            body["seamless_loop"] = True
        
        logger.info(f"Generating sound effect: {request.prompt[:50]}...")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/sound-generation",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Sound effects error: {response.status_code} - {error_text}")
                return SoundEffectsResponse(
                    success=False,
                    error=f"Sound effects generation failed: {response.status_code}"
                )
            
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            generation_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Sound effect generated in {generation_time}ms")
            
            return SoundEffectsResponse(
                success=True,
                audioBase64=audio_base64,
                audioUrl=audio_to_data_url(audio_bytes, "mp3"),
                generationTime=generation_time
            )
            
    except ValueError as e:
        return SoundEffectsResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Sound effects error: {e}", exc_info=True)
        return SoundEffectsResponse(success=False, error=str(e))


# ============================================================================
# Get Available Voices
# ============================================================================

async def get_voices() -> VoicesResponse:
    """
    Get list of available voices from ElevenLabs
    
    Returns:
        VoicesResponse with list of voices or error
    """
    try:
        api_key = get_api_key()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{ELEVENLABS_BASE_URL}/voices",
                headers={"xi-api-key": api_key},
            )
            
            if not response.is_success:
                return VoicesResponse(
                    success=False,
                    error=f"Failed to get voices: {response.status_code}"
                )
            
            result = response.json()
            
            voices = [
                Voice(
                    voice_id=v.get("voice_id", ""),
                    name=v.get("name", ""),
                    category=v.get("category"),
                    description=v.get("description"),
                    labels=v.get("labels"),
                    preview_url=v.get("preview_url"),
                )
                for v in result.get("voices", [])
            ]
            
            logger.info(f"Retrieved {len(voices)} voices")
            
            return VoicesResponse(success=True, voices=voices)
            
    except ValueError as e:
        return VoicesResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Get voices error: {e}", exc_info=True)
        return VoicesResponse(success=False, error=str(e))


# ============================================================================
# Voice Cloning
# ============================================================================

async def clone_voice(request: VoiceCloningRequest) -> VoiceCloningResponse:
    """
    Clone voice from audio sample (instant voice cloning)
    
    Args:
        request: Voice cloning request with audio sample
        
    Returns:
        VoiceCloningResponse with new voice ID or error
    """
    try:
        api_key = get_api_key()
        
        # Decode audio from base64
        audio_bytes = base64.b64decode(request.audioBase64)
        
        logger.info(f"Cloning voice: {request.name}")
        
        # Create multipart form data
        files = {
            "files": ("audio.mp3", audio_bytes, "audio/mpeg"),
        }
        
        data = {
            "name": request.name,
        }
        
        if request.description:
            data["description"] = request.description
        
        if request.removeBackgroundNoise:
            data["remove_background_noise"] = "true"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/voices/add",
                headers={"xi-api-key": api_key},
                files=files,
                data=data,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Voice cloning error: {response.status_code} - {error_text}")
                return VoiceCloningResponse(
                    success=False,
                    error=f"Voice cloning failed: {response.status_code}"
                )
            
            result = response.json()
            voice_id = result.get("voice_id")
            
            logger.info(f"Voice cloned successfully: {voice_id}")
            
            return VoiceCloningResponse(success=True, voiceId=voice_id)
            
    except ValueError as e:
        return VoiceCloningResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Voice cloning error: {e}", exc_info=True)
        return VoiceCloningResponse(success=False, error=str(e))


# ============================================================================
# Voice Design (Text-to-Voice)
# ============================================================================

async def design_voice(request: VoiceDesignRequest) -> VoiceDesignResponse:
    """
    Design a custom voice from text description.
    
    Uses ElevenLabs Text-to-Voice API to generate voice previews
    from a text description of the desired voice characteristics.
    
    Models:
    - eleven_multilingual_ttv_v2: Stable, supports many languages
    - eleven_ttv_v3: More expressive, newer model
    
    Args:
        request: Voice design request with description and preview text
        
    Returns:
        VoiceDesignResponse with list of voice previews
    """
    start_time = time.time()
    
    try:
        api_key = get_api_key()
        
        if not request.voiceDescription:
            return VoiceDesignResponse(
                success=False,
                error="Voice description is required for design action"
            )
        
        if not request.text:
            return VoiceDesignResponse(
                success=False,
                error="Preview text is required for design action"
            )
        
        body = {
            "voice_description": request.voiceDescription,
            "text": request.text,
        }
        
        if request.model:
            body["model_id"] = request.model
        
        logger.info(f"Designing voice: {request.voiceDescription[:50]}...")
        
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/text-to-voice/design",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Voice design error: {response.status_code} - {error_text}")
                return VoiceDesignResponse(
                    success=False,
                    error=f"Voice design failed: {response.status_code}"
                )
            
            result = response.json()
            
            # Parse previews from response
            previews = []
            for preview in result.get("previews", []):
                audio_base64 = preview.get("audio_base_64", "")
                generated_id = preview.get("generated_voice_id", "")
                if audio_base64 and generated_id:
                    previews.append(VoiceDesignPreview(
                        generatedVoiceId=generated_id,
                        audioBase64=audio_base64
                    ))
            
            if not previews:
                return VoiceDesignResponse(
                    success=False,
                    error="No voice previews generated. Try a different description."
                )
            
            generation_time = int((time.time() - start_time) * 1000)
            logger.info(f"Voice design generated {len(previews)} previews in {generation_time}ms")
            
            return VoiceDesignResponse(success=True, previews=previews)
            
    except ValueError as e:
        return VoiceDesignResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Voice design error: {e}", exc_info=True)
        return VoiceDesignResponse(success=False, error=str(e))


async def save_designed_voice(request: VoiceDesignRequest) -> VoiceDesignResponse:
    """
    Save a designed voice to the voice library.
    
    After generating voice previews with design_voice(), use this function
    to save the selected voice to your ElevenLabs account.
    
    Args:
        request: Voice design request with generatedVoiceId and name
        
    Returns:
        VoiceDesignResponse with saved voiceId
    """
    try:
        api_key = get_api_key()
        
        if not request.generatedVoiceId:
            return VoiceDesignResponse(
                success=False,
                error="Generated voice ID is required for save action"
            )
        
        if not request.name:
            return VoiceDesignResponse(
                success=False,
                error="Voice name is required for save action"
            )
        
        body = {
            "voice_name": request.name,
            "generated_voice_id": request.generatedVoiceId,
        }
        
        if request.description:
            body["voice_description"] = request.description
        
        logger.info(f"Saving designed voice: {request.name}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/text-to-voice",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Save voice error: {response.status_code} - {error_text}")
                return VoiceDesignResponse(
                    success=False,
                    error=f"Failed to save voice: {response.status_code}"
                )
            
            result = response.json()
            voice_id = result.get("voice_id")
            
            logger.info(f"Voice saved successfully: {voice_id}")
            
            return VoiceDesignResponse(success=True, voiceId=voice_id)
            
    except ValueError as e:
        return VoiceDesignResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Save voice error: {e}", exc_info=True)
        return VoiceDesignResponse(success=False, error=str(e))


# ============================================================================
# Dialog Generation (Text-to-Dialogue)
# ============================================================================

async def generate_dialog(request: DialogRequest) -> DialogResponse:
    """
    Generate multi-speaker dialog using ElevenLabs Text-to-Dialogue API.
    
    Creates natural-sounding conversations with multiple voices.
    Uses the Eleven v3 model for best results.
    
    Supports audio tags for emotions and delivery:
    - Emotions: [sad], [laughing], [whispering], [excited]
    - Events: [applause], [footsteps], [door creaking]
    
    Args:
        request: Dialog request with list of speaker inputs
        
    Returns:
        DialogResponse with combined audio
    """
    start_time = time.time()
    
    try:
        api_key = get_api_key()
        
        if len(request.inputs) < 2:
            return DialogResponse(
                success=False,
                error="Dialog requires at least 2 speakers"
            )
        
        # Build inputs for ElevenLabs API (flat array per docs)
        inputs = [
            {
                "voice_id": inp.voiceId,
                "text": inp.text,
            }
            for inp in request.inputs
        ]
        
        body = {
            "inputs": inputs,
            "model_id": request.modelId or "eleven_v3",
        }
        
        # Build query params for output format
        params = {}
        if request.outputFormat:
            params["output_format"] = request.outputFormat
        
        logger.info(f"Generating dialog with {len(request.inputs)} speakers")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/text-to-dialogue",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                params=params,
                json=body,
            )
            
            if not response.is_success:
                error_text = response.text
                logger.error(f"Dialog generation error: {response.status_code} - {error_text}")
                return DialogResponse(
                    success=False,
                    error=f"Dialog generation failed: {response.status_code}"
                )
            
            audio_bytes = response.content
            audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            generation_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Dialog generated successfully in {generation_time}ms")
            
            return DialogResponse(
                success=True,
                audioBase64=audio_base64,
                audioUrl=audio_to_data_url(audio_bytes, "mp3"),
                generationTime=generation_time
            )
            
    except ValueError as e:
        return DialogResponse(success=False, error=str(e))
    
    except Exception as e:
        logger.error(f"Dialog generation error: {e}", exc_info=True)
        return DialogResponse(success=False, error=str(e))
