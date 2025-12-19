import { NextResponse } from 'next/server';
import { getVoices } from '@/agents/audio_agent/services/elevenlabs.service';

/**
 * GET /api/ai/media/audio/voices
 * Fetch all available voices from ElevenLabs
 */
export async function GET() {
    try {
        const result = await getVoices();

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            voices: result.voices,
        });
    } catch (error) {
        console.error('Voices API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch voices',
            },
            { status: 500 }
        );
    }
}
