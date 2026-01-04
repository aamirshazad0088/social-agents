import { NextRequest, NextResponse } from 'next/server';
import { getPythonBackendUrl } from '@/lib/backend-url';

const PYTHON_BACKEND_URL = getPythonBackendUrl();

/**
 * GET /api/ai/media/runway/models
 * Get available Runway models and options
 */
export async function GET() {
    try {
        const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/api/v1/media/runway/models`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });

    } catch (error) {
        console.error('Runway models error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get models' },
            { status: 500 }
        );
    }
}
