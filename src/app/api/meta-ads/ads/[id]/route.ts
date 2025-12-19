/**
 * Meta Ads Individual Ad Endpoint
 * GET /api/meta-ads/ads/[id] - Get ad details
 * PATCH /api/meta-ads/ads/[id] - Update ad
 * DELETE /api/meta-ads/ads/[id] - Delete ad
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * GET /api/meta-ads/ads/[id]
 * Get ad details with insights
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
          message: 'Please connect your Meta Ads account to view ad details.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;
    const accountId = creds.account_id;

    // Fetch ad from Meta API
    const adResponse = await fetch(
      `${META_API_BASE}/${adId}?` +
      `fields=id,name,adset_id,campaign_id,status,effective_status,delivery_status,` +
      `created_time,updated_time,preview_shareable_link,` +
      `creative{id,name,object_story_spec},` +
      `insights{impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,conversions,cost_per_conversion,video_views}` +
      `&access_token=${accessToken}`
    );

    if (!adResponse.ok) {
      const error = await adResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch ad');
    }

    const adData = await adResponse.json();
    
    // Transform to our format
    const creative = adData.creative || {};
    const objectStorySpec = creative.object_story_spec || {};
    const linkData = objectStorySpec.link_data || {};
    const videoData = objectStorySpec.video_data || {};
    const photoData = objectStorySpec.photo_data || {};

    const ad = {
      id: adData.id,
      name: adData.name,
      adset_id: adData.adset_id,
      campaign_id: adData.campaign_id,
      status: adData.status,
      effective_status: adData.effective_status,
      delivery_status: adData.delivery_status,
      created_time: adData.created_time,
      updated_time: adData.updated_time,
      preview_shareable_link: adData.preview_shareable_link,
      creative: {
        id: creative.id,
        name: creative.name,
        title: linkData.name || videoData.title,
        body: linkData.message || videoData.message || photoData.caption,
        call_to_action_type: linkData.call_to_action?.type || videoData.call_to_action?.type,
        link_url: linkData.link || videoData.call_to_action?.value?.link,
        image_hash: linkData.image_hash || photoData.image_hash || videoData.image_hash,
        image_url: linkData.picture || photoData.url,
        video_id: videoData.video_id,
        object_story_spec: objectStorySpec,
      },
      insights: adData.insights ? {
        impressions: adData.insights.impressions || 0,
        reach: adData.insights.reach || 0,
        clicks: adData.insights.clicks || 0,
        spend: adData.insights.spend || 0,
        cpc: adData.insights.cpc || 0,
        cpm: adData.insights.cpm || 0,
        ctr: adData.insights.ctr || 0,
        frequency: adData.insights.frequency || 0,
        conversions: adData.insights.conversions || 0,
        cost_per_conversion: adData.insights.cost_per_conversion || 0,
        video_views: adData.insights.video_views || 0,
      } : undefined,
    };

    return NextResponse.json({ ad });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meta-ads/ads/[id]
 * Update ad (name, status, etc.)
 * 
 * Body: {
 *   name?: string,
 *   status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED',
 * }
 */
export async function PATCH(
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
          message: 'Please connect your Meta Ads account to view ad details.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;
    const accountId = creds.account_id;

    // Build update payload
    const updatePayload: any = { access_token: accessToken };
    if (body.name) updatePayload.name = body.name;
    if (body.status) updatePayload.status = body.status;

    // Update ad via Meta API
    const updateResponse = await fetch(
      `${META_API_BASE}/${adId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error?.message || 'Failed to update ad');
    }

    const result = await updateResponse.json();

    return NextResponse.json({
      success: true,
      ad: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update ad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meta-ads/ads/[id]
 * Delete ad
 */
export async function DELETE(
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
          message: 'Please connect your Meta Ads account to view ad details.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;
    const accountId = creds.account_id;

    // Delete ad via Meta API
    const deleteResponse = await fetch(
      `${META_API_BASE}/${adId}?access_token=${accessToken}`,
      {
        method: 'DELETE',
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.error?.message || 'Failed to delete ad');
    }

    return NextResponse.json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete ad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

