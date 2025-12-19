/**
 * Meta Ads Ad Preview Endpoint
 * GET /api/meta-ads/ads/[id]/preview - Get ad preview
 * POST /api/meta-ads/ads/[id]/preview - Generate ad preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * GET /api/meta-ads/ads/[id]/preview
 * Get ad preview link
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: adId } = await params;
    const { searchParams } = new URL(request.url);
    const adFormat = searchParams.get('ad_format') || 'DESKTOP_FEED_STANDARD';

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get Meta credentials
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to view ad previews.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;

    // Get ad preview
    const previewResponse = await fetch(
      `${META_API_BASE}/${adId}/previews?` +
      `ad_format=${adFormat}&` +
      `access_token=${accessToken}`
    );

    if (!previewResponse.ok) {
      const error = await previewResponse.json();
      throw new Error(error.error?.message || 'Failed to get ad preview');
    }

    const previewData = await previewResponse.json();

    return NextResponse.json({
      previews: previewData.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get ad preview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta-ads/ads/[id]/preview
 * Generate ad preview for specific format
 * 
 * Body: {
 *   ad_format?: string, // DESKTOP_FEED_STANDARD, INSTAGRAM_STANDARD, etc.
 *   creative?: object, // Optional: preview with different creative
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: adId } = await params;
    const body = await request.json();
    const { ad_format = 'DESKTOP_FEED_STANDARD', creative } = body;

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get Meta credentials
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to view ad previews.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;

    // Generate preview
    const previewPayload: any = {
      ad_format,
      access_token: accessToken,
    };

    if (creative) {
      previewPayload.creative = creative;
    }

    const previewResponse = await fetch(
      `${META_API_BASE}/${adId}/previews`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewPayload),
      }
    );

    if (!previewResponse.ok) {
      const error = await previewResponse.json();
      throw new Error(error.error?.message || 'Failed to generate ad preview');
    }

    const previewData = await previewResponse.json();

    return NextResponse.json({
      preview: previewData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate ad preview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

