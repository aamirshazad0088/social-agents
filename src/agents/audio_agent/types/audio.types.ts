/**
 * Audio Agent Types
 * TypeScript interfaces for ElevenLabs audio operations
 */

// ============================================================================
// Text-to-Speech Types
// ============================================================================

export interface TTSVoiceSettings {
    stability: number; // 0.0 - 1.0
    similarity_boost: number; // 0.0 - 1.0
    style?: number; // 0.0 - 1.0
    use_speaker_boost?: boolean;
}

export interface TTSRequest {
    text: string;
    voiceId: string;
    modelId?: string;
    outputFormat?: string;
    speed?: number; // 0.7 - 1.2
    voiceSettings?: TTSVoiceSettings;
}

export interface TTSResponse {
    success: boolean;
    audioUrl?: string;
    audioBase64?: string;
    error?: string;
}

// ============================================================================
// Music Generation Types
// ============================================================================

export interface MusicRequest {
    prompt: string;
    durationMs: number; // 10000 - 300000 (10s - 5min)
}

export interface MusicResponse {
    success: boolean;
    audioUrl?: string;
    audioBase64?: string;
    error?: string;
}

// ============================================================================
// Sound Effects Types
// ============================================================================

export interface SoundEffectsRequest {
    prompt: string;
    durationSeconds?: number; // 0.1 - 30
    loop?: boolean;
    promptInfluence?: number; // 0.0 - 1.0
}

export interface SoundEffectsResponse {
    success: boolean;
    audioUrl?: string;
    audioBase64?: string;
    error?: string;
}

// ============================================================================
// Dialog Types
// ============================================================================

export interface DialogLine {
    text: string;
    voiceId: string;
}

export interface DialogRequest {
    inputs: DialogLine[];
    modelId?: string;
    languageCode?: string;
    outputFormat?: string;
}

export interface DialogResponse {
    success: boolean;
    audioUrl?: string;
    audioBase64?: string;
    error?: string;
}

// ============================================================================
// Voice Design Types
// ============================================================================

export interface VoiceDesignRequest {
    voiceDescription: string;
    text: string;
    modelId?: string;
}

export interface VoiceDesignPreview {
    generatedVoiceId: string;
    audioBase64: string;
}

export interface VoiceDesignResponse {
    success: boolean;
    previews?: VoiceDesignPreview[];
    error?: string;
}

// ============================================================================
// Voice Cloning Types
// ============================================================================

export interface VoiceCloningRequest {
    name: string;
    description?: string;
    audioBase64: string; // base64 encoded audio file
    removeBackgroundNoise?: boolean;
}

export interface VoiceCloningResponse {
    success: boolean;
    voiceId?: string;
    error?: string;
}

// ============================================================================
// Voice Remix Types
// ============================================================================

export interface VoiceRemixRequest {
    voiceId: string;
    voiceDescription: string;
    text: string;
}

export interface VoiceRemixResponse {
    success: boolean;
    previews?: VoiceDesignPreview[];
    error?: string;
}

// ============================================================================
// Available Voice Types
// ============================================================================

export interface Voice {
    voice_id: string;
    name: string;
    category?: string;
    description?: string;
    labels?: Record<string, string>;
    preview_url?: string;
}

export interface VoicesResponse {
    success: boolean;
    voices?: Voice[];
    error?: string;
}

// ============================================================================
// Model Types
// ============================================================================

export type TTSModelId =
    | 'eleven_v3'
    | 'eleven_multilingual_v2'
    | 'eleven_turbo_v2_5'
    | 'eleven_flash_v2_5';

export type VoiceDesignModelId =
    | 'eleven_multilingual_ttv_v2'
    | 'eleven_ttv_v3';

export const TTS_MODELS: { id: TTSModelId; name: string; description: string }[] = [
    { id: 'eleven_v3', name: 'Eleven V3 (Alpha)', description: 'Most expressive, best for dialogue' },
    { id: 'eleven_multilingual_v2', name: 'Multilingual V2', description: 'Stable, 70+ languages' },
    { id: 'eleven_turbo_v2_5', name: 'Turbo V2.5', description: 'Fast, balanced quality' },
    { id: 'eleven_flash_v2_5', name: 'Flash V2.5', description: 'Ultra-low latency' },
];

export const OUTPUT_FORMATS = [
    { id: 'mp3_44100_128', name: 'MP3 128kbps' },
    { id: 'mp3_44100_192', name: 'MP3 192kbps' },
    { id: 'pcm_16000', name: 'PCM 16kHz' },
    { id: 'pcm_44100', name: 'PCM 44.1kHz' },
];
