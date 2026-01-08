import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPythonBackendUrl } from '@/lib/backend-url';

const PYTHON_BACKEND_URL = getPythonBackendUrl();

/**
 * GET /api/v1/meta-ads/sdk/offline-conversions/datasets
 * Proxy to Python backend for offline conversion datasets
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const url = `${PYTHON_BACKEND_URL}/api/v1/meta-ads/sdk/offline-conversions/datasets${queryString ? '?' + queryString : ''}`;

        const backendResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('Error fetching offline conversions:', error);
        return NextResponse.json({ error: 'Failed to fetch offline conversions' }, { status: 500 });
    }
}
