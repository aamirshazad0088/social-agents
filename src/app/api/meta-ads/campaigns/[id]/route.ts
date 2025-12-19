/**
 * Meta Ads Individual Campaign Endpoint
 * GET /api/meta-ads/campaigns/[id] - Get campaign details
 * PATCH /api/meta-ads/campaigns/[id] - Update campaign
 * DELETE /api/meta-ads/campaigns/[id] - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import { generateAppSecretProof } from '@/lib/meta/apiUtils';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * GET /api/meta-ads/campaigns/[id]
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

    const { id: campaignId } = await params;
    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { error: 'Meta Ads not connected' },
        { status: 401 }
      );
    }

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(creds.access_token);
    const authParams = `access_token=${creds.access_token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

    const response = await fetch(
      `${META_API_BASE}/${campaignId}?` +
      `fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,` +
      `created_time,updated_time,special_ad_categories,buying_type,bid_strategy,` +
      `insights{impressions,reach,clicks,spend,cpc,cpm,ctr}` +
      `&${authParams}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch campaign');
    }

    const campaign = await response.json();
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meta-ads/campaigns/[id]
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

    const { id: campaignId } = await params;
    const body = await request.json();
    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { error: 'Meta Ads not connected' },
        { status: 401 }
      );
    }

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(creds.access_token);

    // Build update payload
    const updatePayload: Record<string, any> = {
      access_token: creds.access_token,
      ...(appSecretProof && { appsecret_proof: appSecretProof }),
    };

    // Only include fields that are provided
    if (body.name) updatePayload.name = body.name;
    if (body.status) updatePayload.status = body.status;
    if (body.daily_budget !== undefined) updatePayload.daily_budget = body.daily_budget;
    if (body.lifetime_budget !== undefined) updatePayload.lifetime_budget = body.lifetime_budget;
    if (body.bid_strategy) updatePayload.bid_strategy = body.bid_strategy;

    const response = await fetch(
      `${META_API_BASE}/${campaignId}`,
      {
        method: 'POST', // Meta API uses POST for updates
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to update campaign');
    }

    const result = await response.json();

    // Log activity
    try {
      await (supabase.from('activity_logs') as any).insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'campaign_updated',
        resource_type: 'meta_campaign',
        resource_id: campaignId,
        details: { updates: Object.keys(body) },
      });
    } catch {
      // Don't fail if logging fails
    }

    return NextResponse.json({ success: true, campaign: result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meta-ads/campaigns/[id]
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

    const { id: campaignId } = await params;
    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { error: 'Meta Ads not connected' },
        { status: 401 }
      );
    }

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(creds.access_token);

    // Meta API: Set status to DELETED (campaigns can't be truly deleted)
    const response = await fetch(
      `${META_API_BASE}/${campaignId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELETED',
          access_token: creds.access_token,
          ...(appSecretProof && { appsecret_proof: appSecretProof }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete campaign');
    }

    // Log activity
    try {
      await (supabase.from('activity_logs') as any).insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'campaign_deleted',
        resource_type: 'meta_campaign',
        resource_id: campaignId,
      });
    } catch {
      // Don't fail if logging fails
    }

    return NextResponse.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete campaign', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
