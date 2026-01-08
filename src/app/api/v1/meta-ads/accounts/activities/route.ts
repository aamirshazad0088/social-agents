import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getPythonBackendUrl } from '@/lib/backend-url';

const PYTHON_BACKEND_URL = getPythonBackendUrl();

/**
 * GET /api/v1/meta-ads/accounts/activities
 * Proxy to Python backend for account activities
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Forward query params (like limit)
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const url = `${PYTHON_BACKEND_URL}/api/v1/meta-ads/accounts/activities${queryString ? '?' + queryString : ''}`;

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
        console.error('Error fetching account activities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account activities' },
            { status: 500 }
        );
    }
}
