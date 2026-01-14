/**
 * Prompt Improvement API Route
 * 
 * Proxies prompt improvement requests to Python backend
 * Uses the media_prompt_agent with LangChain skills pattern
 */
import { NextRequest, NextResponse } from 'next/server'
import { PYTHON_BACKEND_URL } from '@/lib/python-backend/config'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Forward to Python backend
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/improve/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward auth headers
                ...(request.headers.get('Authorization') && {
                    'Authorization': request.headers.get('Authorization')!
                }),
                ...(request.headers.get('X-Workspace-Id') && {
                    'X-Workspace-Id': request.headers.get('X-Workspace-Id')!
                }),
                ...(request.headers.get('X-User-Id') && {
                    'X-User-Id': request.headers.get('X-User-Id')!
                }),
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: data.detail?.message || data.error || 'Failed to improve prompt'
                },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Prompt improvement error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to improve prompt'
            },
            { status: 500 }
        )
    }
}
