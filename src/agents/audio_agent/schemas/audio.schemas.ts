/**
 * Audio Agent Schemas
 * Zod validation schemas for audio operations
 */

import * as z from 'zod';

// ============================================================================
// Text-to-Speech Schemas
// ============================================================================

export const voiceSettingsSchema = z.object({
    stability: z.number().min(0).max(1).default(0.5),
    similarity_boost: z.number().min(0).max(1).default(0.75),
    style: z.number().min(0).max(1).optional(),
    use_speaker_boost: z.boolean().optional(),
});

export const ttsRequestSchema = z.object({
    text: z.string().min(1, 'Text is required').max(5000),
    voiceId: z.string().min(1, 'Voice ID is required'),
    modelId: z.string().optional().default('eleven_multilingual_v2'),
    outputFormat: z.string().optional().default('mp3_44100_128'),
    speed: z.number().min(0.7).max(1.2).optional().default(1.0),
    voiceSettings: voiceSettingsSchema.optional(),
});

export type TTSRequestInput = z.infer<typeof ttsRequestSchema>;

// ============================================================================
// Music Generation Schemas
// ============================================================================

export const musicRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required').max(2000),
    durationMs: z.number().min(10000).max(300000).default(30000),
});

export type MusicRequestInput = z.infer<typeof musicRequestSchema>;

// ============================================================================
// Sound Effects Schemas
// ============================================================================

export const soundEffectsRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required').max(1000),
    durationSeconds: z.number().min(0.1).max(30).optional(),
    loop: z.boolean().optional().default(false),
    promptInfluence: z.number().min(0).max(1).optional().default(0.3),
});

export type SoundEffectsRequestInput = z.infer<typeof soundEffectsRequestSchema>;

// ============================================================================
// Dialog Schemas
// ============================================================================

export const dialogLineSchema = z.object({
    text: z.string().min(1, 'Text is required'),
    voiceId: z.string().min(1, 'Voice ID is required'),
});

export const dialogRequestSchema = z.object({
    inputs: z.array(dialogLineSchema).min(1, 'At least one dialog line is required'),
    modelId: z.string().optional().default('eleven_v3'),
    languageCode: z.string().optional(),
    outputFormat: z.string().optional().default('mp3_44100_128'),
});

export type DialogRequestInput = z.infer<typeof dialogRequestSchema>;

// ============================================================================
// Voice Design Schemas
// ============================================================================

export const voiceDesignRequestSchema = z.object({
    voiceDescription: z.string().min(20, 'Description must be at least 20 characters').max(1000),
    text: z.string().min(100, 'Preview text must be at least 100 characters').max(1000),
    modelId: z.string().optional().default('eleven_multilingual_ttv_v2'),
});

export type VoiceDesignRequestInput = z.infer<typeof voiceDesignRequestSchema>;

// ============================================================================
// Voice Cloning Schemas
// ============================================================================

export const voiceCloningRequestSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    audioBase64: z.string().min(1, 'Audio data is required'),
    removeBackgroundNoise: z.boolean().optional().default(false),
});

export type VoiceCloningRequestInput = z.infer<typeof voiceCloningRequestSchema>;

// ============================================================================
// Voice Remix Schemas
// ============================================================================

export const voiceRemixRequestSchema = z.object({
    voiceId: z.string().min(1, 'Voice ID is required'),
    voiceDescription: z.string().min(20).max(1000),
    text: z.string().min(100).max(1000),
});

export type VoiceRemixRequestInput = z.infer<typeof voiceRemixRequestSchema>;

// ============================================================================
// Save Voice Schema
// ============================================================================

export const saveVoiceRequestSchema = z.object({
    generatedVoiceId: z.string().min(1, 'Generated voice ID is required'),
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
});

export type SaveVoiceRequestInput = z.infer<typeof saveVoiceRequestSchema>;
