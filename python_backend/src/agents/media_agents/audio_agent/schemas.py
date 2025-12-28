"""
Audio Agent Schemas
Pydantic models for ElevenLabs audio generation
"""
from typing import Optional, Literal, List, Dict
from pydantic import BaseModel, Field


# ============================================================================
# TTS (Text-to-Speech) Types
# ============================================================================

class TTSVoiceSettings(BaseModel):
    """Voice settings for TTS"""
    stability: float = Field(0.5, ge=0.0, le=1.0, description="Voice stability")
    similarity_boost: float = Field(0.75, ge=0.0, le=1.0, description="Similarity boost")
    style: Optional[float] = Field(None, ge=0.0, le=1.0, description="Speaking style")
    use_speaker_boost: Optional[bool] = Field(None, description="Use speaker boost")


class TTSRequest(BaseModel):
    """Request for text-to-speech generation"""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to convert to speech")
    voiceId: str = Field(..., description="ElevenLabs voice ID")
    modelId: Optional[str] = Field("eleven_multilingual_v2", description="TTS model ID")
    outputFormat: Optional[str] = Field("mp3_44100_128", description="Output format")
    speed: Optional[float] = Field(None, ge=0.7, le=1.2, description="Speech speed")
    voiceSettings: Optional[TTSVoiceSettings] = None


class TTSResponse(BaseModel):
    """Response from TTS generation"""
    success: bool
    audioBase64: Optional[str] = Field(None, description="Base64 encoded audio")
    audioUrl: Optional[str] = Field(None, description="Audio data URL")
    error: Optional[str] = None
    generationTime: Optional[int] = Field(None, description="Generation time in ms")


# ============================================================================
# Music Generation Types
# ============================================================================

class MusicRequest(BaseModel):
    """Request for music generation"""
    prompt: str = Field(..., min_length=1, max_length=1000, description="Music prompt")
    durationMs: int = Field(..., ge=10000, le=300000, description="Duration 10s-5min in ms")


class MusicResponse(BaseModel):
    """Response from music generation"""
    success: bool
    audioBase64: Optional[str] = None
    audioUrl: Optional[str] = None
    error: Optional[str] = None
    generationTime: Optional[int] = None


# ============================================================================
# Sound Effects Types
# ============================================================================

class SoundEffectsRequest(BaseModel):
    """Request for sound effects generation"""
    prompt: str = Field(..., min_length=1, max_length=500, description="Sound effect prompt")
    durationSeconds: Optional[float] = Field(None, ge=0.1, le=30.0, description="Duration in seconds")
    promptInfluence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Prompt influence")
    loop: Optional[bool] = Field(False, description="Create seamless loop (eleven_text_to_sound_v2 only)")


class SoundEffectsResponse(BaseModel):
    """Response from sound effects generation"""
    success: bool
    audioBase64: Optional[str] = None
    audioUrl: Optional[str] = None
    error: Optional[str] = None
    generationTime: Optional[int] = None


# ============================================================================
# Voice Cloning Types
# ============================================================================

class VoiceCloningRequest(BaseModel):
    """Request for instant voice cloning"""
    name: str = Field(..., min_length=1, max_length=100, description="Voice name")
    description: Optional[str] = Field(None, max_length=500, description="Voice description")
    audioBase64: str = Field(..., description="Base64 encoded audio sample")
    removeBackgroundNoise: Optional[bool] = Field(False, description="Remove background noise")


class VoiceCloningResponse(BaseModel):
    """Response from voice cloning"""
    success: bool
    voiceId: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# Voice Design Types (Text-to-Voice)
# ============================================================================

class VoiceDesignRequest(BaseModel):
    """Request for voice design from text description"""
    action: Literal["design", "save"] = Field(..., description="'design' to create previews, 'save' to save voice")
    voiceDescription: Optional[str] = Field(None, min_length=20, max_length=1000, description="Voice description for design")
    text: Optional[str] = Field(None, min_length=100, max_length=1000, description="Preview text to speak")
    generatedVoiceId: Optional[str] = Field(None, description="Generated voice ID for save action")
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Voice name for save action")
    description: Optional[str] = Field(None, max_length=500, description="Voice description for save action")
    model: Optional[str] = Field("eleven_multilingual_ttv_v2", description="TTV model: eleven_multilingual_ttv_v2 or eleven_ttv_v3")


class VoiceDesignPreview(BaseModel):
    """Voice design preview with audio"""
    generatedVoiceId: str
    audioBase64: str


class VoiceDesignResponse(BaseModel):
    """Response from voice design"""
    success: bool
    previews: Optional[List[VoiceDesignPreview]] = None
    voiceId: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# Dialog Generation Types (Text-to-Dialogue)
# ============================================================================

class DialogInput(BaseModel):
    """Single dialog line with voice"""
    text: str = Field(..., min_length=1, max_length=2000, description="Dialog text")
    voiceId: str = Field(..., description="Voice ID for this line")


class DialogRequest(BaseModel):
    """Request for multi-speaker dialog generation"""
    inputs: List[DialogInput] = Field(..., min_length=2, description="Dialog inputs (min 2 speakers)")
    modelId: Optional[str] = Field("eleven_v3", description="Model ID (eleven_v3 recommended)")
    outputFormat: Optional[str] = Field("mp3_44100_128", description="Output audio format")


class DialogResponse(BaseModel):
    """Response from dialog generation"""
    success: bool
    audioBase64: Optional[str] = None
    audioUrl: Optional[str] = None
    error: Optional[str] = None
    generationTime: Optional[int] = None


# ============================================================================
# Voice Types
# ============================================================================

class Voice(BaseModel):
    """Available voice information"""
    voice_id: str
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    labels: Optional[Dict[str, str]] = None
    preview_url: Optional[str] = None


class VoicesResponse(BaseModel):
    """Response from get voices"""
    success: bool
    voices: Optional[List[Voice]] = None
    error: Optional[str] = None


# ============================================================================
# Model Constants
# ============================================================================

TTS_MODELS = [
    {"id": "eleven_v3", "name": "Eleven V3 (Alpha)", "description": "Most expressive, best for dialogue"},
    {"id": "eleven_multilingual_v2", "name": "Multilingual V2", "description": "Stable, 70+ languages"},
    {"id": "eleven_turbo_v2_5", "name": "Turbo V2.5", "description": "Fast, balanced quality"},
    {"id": "eleven_flash_v2_5", "name": "Flash V2.5", "description": "Ultra-low latency"},
]

OUTPUT_FORMATS = [
    {"id": "mp3_44100_128", "name": "MP3 128kbps"},
    {"id": "mp3_44100_192", "name": "MP3 192kbps"},
    {"id": "pcm_16000", "name": "PCM 16kHz"},
    {"id": "pcm_44100", "name": "PCM 44.1kHz"},
]
