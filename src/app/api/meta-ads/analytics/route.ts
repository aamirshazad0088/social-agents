/**
 * Meta Ads Analytics Endpoint
 * GET /api/meta-ads/analytics - Get analytics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to get workspace',
          message: 'Unable to retrieve workspace information.'
        },
        { status: 500 }
      );
    }

    // Get Meta credentials
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to view analytics.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    if (!accountId) {
      return NextResponse.json(
        { 
          error: 'Invalid account configuration',
          message: 'Ad account ID is missing. Please reconnect your Meta Ads account.'
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'last_7d';
    const datePreset = searchParams.get('datePreset') || dateRange;

    // Fetch insights from Meta API
    const insightsResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/insights?` +
      `date_preset=${datePreset}&` +
      `fields=spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,conversions,cost_per_conversion,actions&` +
      `access_token=${accessToken}`
    );

    if (!insightsResponse.ok) {
      const errorData = await insightsResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to fetch analytics from Meta API');
    }

    const insightsData = await insightsResponse.json();
    const insights = insightsData.data?.[0] || {};

    // Fetch campaigns for top campaigns
    const campaignsResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/campaigns?` +
      `fields=id,name,insights{spend,impressions,clicks,conversions,actions}&` +
      `access_token=${accessToken}`
    );

    let topCampaigns: any[] = [];
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      topCampaigns = (campaignsData.data || [])
        .map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          spend: parseFloat(campaign.insights?.spend || 0),
          impressions: parseInt(campaign.insights?.impressions || 0),
          clicks: parseInt(campaign.insights?.clicks || 0),
          conversions: parseInt(campaign.insights?.conversions || 0),
          roas: campaign.insights?.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0,
        }))
        .sort((a: any, b: any) => b.spend - a.spend)
        .slice(0, 10);
    }

    // Calculate summary
    const summary = {
      spend: parseFloat(insights.spend || 0),
      impressions: parseInt(insights.impressions || 0),
      reach: parseInt(insights.reach || 0),
      clicks: parseInt(insights.clicks || 0),
      ctr: parseFloat(insights.ctr || 0),
      cpc: parseFloat(insights.cpc || 0),
      cpm: parseFloat(insights.cpm || 0),
      conversions: parseInt(insights.conversions || 0),
      costPerConversion: parseFloat(insights.cost_per_conversion || 0),
      frequency: parseFloat(insights.frequency || 0),
      roas: insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0,
    };

    return NextResponse.json({
      summary,
      trends: [], // Would need time-series data from Meta API
      topCampaigns,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while fetching analytics.'
      },
      { status: 500 }
    );
  }
}
