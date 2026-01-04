import { NextRequest, NextResponse } from 'next/server';
import { getPythonBackendUrl } from '@/lib/backend-url';

const PYTHON_BACKEND_URL = getPythonBackendUrl();

/**
 * POST /api/ai/media/runway/image-to-video
 * Generate video from image using Runway Gen4 Turbo
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/api/v1/media/runway/image-to-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });

    } catch (error) {
        console.error('Runway image-to-video error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate video from image' },
            { status: 500 }
        );
    }
}
