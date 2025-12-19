/**
 * Canva Export Formats API Route
 * Get available export formats for a design
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Get Canva access token for user
 */
async function getCanvaToken(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await (supabase
    .from('user_integrations') as any)
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'canva')
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token is expired
  if (new Date(data.expires_at) <= new Date()) {
    return null;
  }

  return data.access_token;
}

/**
 * GET /api/canva/export-formats
 * Get available export formats for a design
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getCanvaToken(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Canva not connected', needsAuth: true },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const designId = searchParams.get('designId');

    if (!designId) {
      return NextResponse.json(
        { error: 'designId is required' },
        { status: 400 }
      );
    }

    // Fetch available export formats from Canva API
    const response = await fetch(
      `https://api.canva.com/rest/v1/designs/${designId}/export-formats`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch export formats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Parse the formats into a simpler structure
    // Canva returns: { formats: { png: {...}, jpg: {...}, mp4: {...}, ... } }
    const formats: Record<string, boolean> = {};
    
    if (data.formats) {
      for (const format of Object.keys(data.formats)) {
        formats[format] = true;
      }
    }

    return NextResponse.json({
      designId,
      formats,
      raw: data, // Include raw response for debugging
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch export formats' },
      { status: 500 }
    );
  }
}
