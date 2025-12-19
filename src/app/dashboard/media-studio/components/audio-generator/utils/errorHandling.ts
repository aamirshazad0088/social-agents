/**
 * Error Handling Utilities for Audio Generator
 * Provides user-friendly error messages and common error handling logic
 */

export interface AudioError {
    message: string;
    icon: string;
    isRetryable: boolean;
    suggestion?: string;
}

/**
 * Converts API/network errors into user-friendly messages with icons
 */
export function parseAudioError(error: unknown): AudioError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // API Authentication Errors
    if (errorMessage.includes('API_KEY') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
            icon: '🔑',
            message: 'API key not configured correctly',
            isRetryable: false,
            suggestion: 'Please add ELEVENLABS_API_KEY to your environment variables and restart the server.'
        };
    }

    // Rate Limiting
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return {
            icon: '⏱️',
            message: 'Rate limit reached',
            isRetryable: true,
            suggestion: 'Please wait a moment before trying again, or upgrade your ElevenLabs plan for higher limits.'
        };
    }

    // Network Errors
    if (errorMessage.includes('fetch failed') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        return {
            icon: '🌐',
            message: 'Network connection error',
            isRetryable: true,
            suggestion: 'Please check your internet connection and try again.'
        };
    }

    // Timeout Errors
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('AbortError')) {
        return {
            icon: '⏰',
            message: 'Request timed out',
            isRetryable: true,
            suggestion: 'The server took too long to respond. Try again with shorter content or check your connection.'
        };
    }

    // Voice Not Found
    if (errorMessage.includes('voice') && (errorMessage.includes('not found') || errorMessage.includes('invalid'))) {
        return {
            icon: '🎤',
            message: 'Selected voice is unavailable',
            isRetryable: false,
            suggestion: 'This voice may have been removed. Please choose a different voice.'
        };
    }

    // Content Too Long
    if (errorMessage.includes('too long') || errorMessage.includes('exceeded') || errorMessage.includes('413')) {
        return {
            icon: '📝',
            message: 'Content exceeds maximum length',
            isRetryable: false,
            suggestion: 'Please shorten your text and try again.'
        };
    }

    // Invalid Parameters
    if (errorMessage.includes('422') || errorMessage.includes('invalid') || errorMessage.includes('validation')) {
        return {
            icon: '⚠️',
            message: 'Invalid parameters',
            isRetryable: false,
            suggestion: 'Please check your inputs and try again.'
        };
    }

    // Insufficient Audio Quality (Voice Cloning)
    if (errorMessage.includes('quality') || errorMessage.includes('insufficient')) {
        return {
            icon: '🎤',
            message: 'Audio quality too low',
            isRetryable: false,
            suggestion: 'Use at least 1 minute of clear speech without background noise.'
        };
    }

    // Duplicate Name
    if (errorMessage.includes('409') || (errorMessage.includes('already exists') || errorMessage.includes('duplicate'))) {
        return {
            icon: '📛',
            message: 'Name already exists',
            isRetryable: false,
            suggestion: 'Please choose a different name.'
        };
    }

    // File Too Large
    if (errorMessage.includes('file') && errorMessage.includes('large')) {
        return {
            icon: '📦',
            message: 'File size too large',
            isRetryable: false,
            suggestion: 'Please use a smaller file or shorter recording (max 10MB).'
        };
    }

    // Default error
    const cleanMessage = errorMessage
        .replace('ElevenLabs API error:', '')
        .replace(/^\d+\s*-\s*/, '') // Remove status codes like "401 - "
        .trim();

    return {
        icon: '❌',
        message: cleanMessage || 'An error occurred',
        isRetryable: true,
        suggestion: 'Please try again. If the problem persists, check your API key and connection.'
    };
}

/**
 * Format error for display in UI
 */
export function formatErrorMessage(audioError: AudioError, showSuggestion: boolean = true): string {
    let message = `${audioError.icon} ${audioError.message}`;
    if (showSuggestion && audioError.suggestion) {
        message += ` — ${audioError.suggestion}`;
    }
    return message;
}

/**
 * Create abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timeoutId };
}

/**
 * Validation helpers
 */
export const validation = {
    text: (text: string, minLength: number = 3, maxLength: number = 5000) => {
        if (!text.trim()) {
            return { valid: false, error: '📝 Please enter some text' };
        }
        if (text.length < minLength) {
            return { valid: false, error: `📝 Text too short. Need at least ${minLength} characters (currently ${text.length})` };
        }
        if (text.length > maxLength) {
            return { valid: false, error: `📝 Text too long. Maximum ${maxLength} characters (currently ${text.length})` };
        }
        return { valid: true, error: '' };
    },

    voiceSelected: (voiceId: string) => {
        if (!voiceId) {
            return { valid: false, error: '🎤 Please select a voice from the dropdown above' };
        }
        return { valid: true, error: '' };
    },

    audioFile: (audioBase64: string | null) => {
        if (!audioBase64) {
            return { valid: false, error: '🎤 Please upload an audio file or record your voice' };
        }
        const sizeKB = Math.round((audioBase64.length * 0.75) / 1024);
        if (sizeKB < 50) {
            return { valid: false, error: '🎤 Audio too short. Please provide at least 1 minute of clear speech' };
        }
        if (sizeKB > 10240) {
            return { valid: false, error: '🎤 Audio too large (max 10MB). Use a shorter recording or compress the file' };
        }
        return { valid: true, error: '' };
    },

    name: (name: string, minLength: number = 3) => {
        if (!name.trim()) {
            return { valid: false, error: '✏️ Please enter a name' };
        }
        if (name.length < minLength) {
            return { valid: false, error: `✏️ Name too short. Use at least ${minLength} characters` };
        }
        return { valid: true, error: '' };
    },

    voiceDescription: (description: string, minLength: number = 20) => {
        if (!description.trim()) {
            return { valid: false, error: '🎤 Please describe the voice you want to create' };
        }
        if (description.length < minLength) {
            return { valid: false, error: `🎤 Description too short (${description.length}/${minLength}). Add details about age, gender, accent, and tone` };
        }
        return { valid: true, error: '' };
    },

    dialogLines: (lines: Array<{ text: string; voiceId: string }>) => {
        const emptyLines = lines.filter(l => !l.text.trim());
        const missingVoices = lines.filter(l => l.text.trim() && !l.voiceId);
        const validLines = lines.filter(l => l.text.trim() && l.voiceId);
        const tooShort = validLines.filter(l => l.text.trim().length < 3);

        if (emptyLines.length > 0) {
            return { valid: false, error: `💬 ${emptyLines.length} dialog line(s) are empty. Please fill them in or remove them` };
        }
        if (missingVoices.length > 0) {
            return { valid: false, error: `🎤 ${missingVoices.length} dialog line(s) need voice selection` };
        }
        if (validLines.length < 2) {
            return { valid: false, error: '💬 Dialog needs at least 2 speakers. Add more lines below' };
        }
        if (tooShort.length > 0) {
            return { valid: false, error: '💬 Some dialog lines are too short. Each needs at least 3 characters' };
        }
        return { valid: true, error: '' };
    },
};
