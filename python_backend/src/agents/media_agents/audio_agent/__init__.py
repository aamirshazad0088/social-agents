"""Audio Agent - Main Export"""
from .service import (
    generate_speech,
    generate_music,
    generate_sound_effects,
    get_voices,
    clone_voice,
)
from .schemas import (
    TTSRequest,
    TTSResponse,
    MusicRequest,
    MusicResponse,
    SoundEffectsRequest,
    SoundEffectsResponse,
    VoiceCloningRequest,
    VoiceCloningResponse,
    Voice,
    VoicesResponse,
    TTS_MODELS,
    OUTPUT_FORMATS,
)

__all__ = [
    # Service functions
    "generate_speech",
    "generate_music",
    "generate_sound_effects",
    "get_voices",
    "clone_voice",
    # Schemas
    "TTSRequest",
    "TTSResponse",
    "MusicRequest",
    "MusicResponse",
    "SoundEffectsRequest",
    "SoundEffectsResponse",
    "VoiceCloningRequest",
    "VoiceCloningResponse",
    "Voice",
    "VoicesResponse",
    "TTS_MODELS",
    "OUTPUT_FORMATS",
]
