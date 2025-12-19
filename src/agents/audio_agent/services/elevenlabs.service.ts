/**
 * ElevenLabs Service
 * Direct HTTP API implementation for ElevenLabs audio generation
 */

import type {
    TTSRequest,
    TTSResponse,
    MusicRequest,
    MusicResponse,
    SoundEffectsRequest,
    SoundEffectsResponse,
    DialogRequest,
    DialogResponse,
    VoiceDesignRequest,
    VoiceDesignResponse,
    VoiceCloningRequest,
    VoiceCloningResponse,
    VoiceRemixRequest,
    VoiceRemixResponse,
    VoicesResponse,
} from '../types/audio.types';

const BASE_URL = 'https://api.elevenlabs.io/v1';

const getApiKey = () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    return apiKey;
};

// ============================================================================
// Text-to-Speech
// ============================================================================

export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/text-to-speech/${request.voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: request.text,
                model_id: request.modelId || 'eleven_multilingual_v2',
                voice_settings: request.voiceSettings ? {
                    stability: request.voiceSettings.stability,
                    similarity_boost: request.voiceSettings.similarity_boost,
                    style: request.voiceSettings.style,
                    use_speaker_boost: request.voiceSettings.use_speaker_boost,
                } : {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        return {
            success: true,
            audioBase64,
        };
    } catch (error) {
        console.error('TTS Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate speech',
        };
    }
}

// ============================================================================
// Music Generation
// ============================================================================

export async function generateMusic(request: MusicRequest): Promise<MusicResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/music/generate`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: request.prompt,
                duration_seconds: Math.round(request.durationMs / 1000),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        return {
            success: true,
            audioBase64,
        };
    } catch (error) {
        console.error('Music Generation Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate music',
        };
    }
}

// ============================================================================
// Sound Effects Generation
// ============================================================================

export async function generateSoundEffects(request: SoundEffectsRequest): Promise<SoundEffectsResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/sound-generation`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: request.prompt,
                duration_seconds: request.durationSeconds,
                prompt_influence: request.promptInfluence,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        return {
            success: true,
            audioBase64,
        };
    } catch (error) {
        console.error('Sound Effects Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate sound effects',
        };
    }
}

// ============================================================================
// Dialog Generation
// ============================================================================

export async function generateDialog(request: DialogRequest): Promise<DialogResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/text-to-dialogue`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: request.inputs.map(input => ({
                    text: input.text,
                    voice_id: input.voiceId,
                })),
                model_id: request.modelId || 'eleven_v3',
                language_code: request.languageCode,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        return {
            success: true,
            audioBase64,
        };
    } catch (error) {
        console.error('Dialog Generation Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate dialog',
        };
    }
}

// ============================================================================
// Voice Design
// ============================================================================

export async function designVoice(request: VoiceDesignRequest): Promise<VoiceDesignResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/text-to-voice/create-previews`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_description: request.voiceDescription,
                text: request.text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        const previews = result.previews?.map((preview: { generated_voice_id?: string; audio_base_64?: string }) => ({
            generatedVoiceId: preview.generated_voice_id || '',
            audioBase64: preview.audio_base_64 || '',
        })) || [];

        return {
            success: true,
            previews,
        };
    } catch (error) {
        console.error('Voice Design Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to design voice',
        };
    }
}

// ============================================================================
// Voice Cloning (Instant)
// ============================================================================

export async function cloneVoice(request: VoiceCloningRequest): Promise<VoiceCloningResponse> {
    try {
        const apiKey = getApiKey();

        // Convert base64 to Blob
        const audioBuffer = Buffer.from(request.audioBase64, 'base64');

        const formData = new FormData();
        formData.append('name', request.name);
        if (request.description) {
            formData.append('description', request.description);
        }
        formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
        if (request.removeBackgroundNoise) {
            formData.append('remove_background_noise', 'true');
        }

        const response = await fetch(`${BASE_URL}/voices/add`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        return {
            success: true,
            voiceId: result.voice_id,
        };
    } catch (error) {
        console.error('Voice Cloning Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to clone voice',
        };
    }
}

// ============================================================================
// Voice Remix
// ============================================================================

export async function remixVoice(request: VoiceRemixRequest): Promise<VoiceRemixResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/text-to-voice/create-previews`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_id: request.voiceId,
                voice_description: request.voiceDescription,
                text: request.text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        const previews = result.previews?.map((preview: { generated_voice_id?: string; audio_base_64?: string }) => ({
            generatedVoiceId: preview.generated_voice_id || '',
            audioBase64: preview.audio_base_64 || '',
        })) || [];

        return {
            success: true,
            previews,
        };
    } catch (error) {
        console.error('Voice Remix Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remix voice',
        };
    }
}

// ============================================================================
// Get Available Voices
// ============================================================================

export async function getVoices(): Promise<VoicesResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        const voices = result.voices?.map((voice: {
            voice_id?: string;
            name?: string;
            category?: string;
            description?: string;
            labels?: Record<string, string>;
            preview_url?: string;
        }) => ({
            voice_id: voice.voice_id || '',
            name: voice.name || '',
            category: voice.category,
            description: voice.description,
            labels: voice.labels,
            preview_url: voice.preview_url,
        })) || [];

        return {
            success: true,
            voices,
        };
    } catch (error) {
        console.error('Get Voices Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get voices',
        };
    }
}

// ============================================================================
// Save Designed Voice to Library
// ============================================================================

export async function saveDesignedVoice(generatedVoiceId: string, name: string, description?: string): Promise<VoiceCloningResponse> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(`${BASE_URL}/text-to-voice/create-voice-from-preview`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_name: name,
                voice_description: description || '',
                generated_voice_id: generatedVoiceId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        return {
            success: true,
            voiceId: result.voice_id,
        };
    } catch (error) {
        console.error('Save Voice Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save voice',
        };
    }
}
