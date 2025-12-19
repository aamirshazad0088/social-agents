/**
 * Meta Ads Ad Insights Endpoint
 * GET /api/meta-ads/ads/[id]/insights - Get ad performance insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import type { DatePreset, Breakdown } from '@/types/metaAds';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * GET /api/meta-ads/ads/[id]/insights
 * Get ad insights/metrics
 * 
 * Query params:
 * - date_preset: DatePreset (today, yesterday, last_7d, etc.)
 * - time_range: { since: string, until: string } (ISO date strings)
 * - breakdowns: Breakdown[] (age, gender, country, etc.)
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
    const datePreset = searchParams.get('date_preset') as DatePreset | null;
    const timeRangeParam = searchParams.get('time_range');
    const breakdownsParam = searchParams.get('breakdowns');

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
          message: 'Please connect your Meta Ads account to view ad insights.'
        },
        { status: 401 }
      );
    }

    const accessToken = creds.access_token;

    // Build insights query
    const insightsParams = new URLSearchParams({
      fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,conversions,cost_per_conversion,actions,action_values,video_views,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions',
      access_token: accessToken,
    });

    if (datePreset) {
      insightsParams.append('date_preset', datePreset);
    } else if (timeRangeParam) {
      try {
        const timeRange = JSON.parse(timeRangeParam);
        if (timeRange.since && timeRange.until) {
          insightsParams.append('time_range', JSON.stringify({
            since: timeRange.since,
            until: timeRange.until,
          }));
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    if (breakdownsParam) {
      try {
        const breakdowns = JSON.parse(breakdownsParam) as Breakdown[];
        if (Array.isArray(breakdowns) && breakdowns.length > 0) {
          insightsParams.append('breakdowns', breakdowns.join(','));
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Fetch insights from Meta API
    const insightsResponse = await fetch(
      `${META_API_BASE}/${adId}/insights?${insightsParams.toString()}`
    );

    if (!insightsResponse.ok) {
      const error = await insightsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch ad insights');
    }

    const insightsData = await insightsResponse.json();
    const insights = insightsData.data?.[0] || {};

    // Transform insights
    const transformedInsights = {
      impressions: parseInt(insights.impressions || '0'),
      reach: parseInt(insights.reach || '0'),
      clicks: parseInt(insights.clicks || '0'),
      spend: parseFloat(insights.spend || '0'),
      cpc: parseFloat(insights.cpc || '0'),
      cpm: parseFloat(insights.cpm || '0'),
      ctr: parseFloat(insights.ctr || '0'),
      frequency: parseFloat(insights.frequency || '0'),
      conversions: parseInt(insights.conversions || '0'),
      cost_per_conversion: parseFloat(insights.cost_per_conversion || '0'),
      video_views: parseInt(insights.video_views || '0'),
      video_p25_watched_actions: parseInt(insights.video_p25_watched_actions || '0'),
      video_p50_watched_actions: parseInt(insights.video_p50_watched_actions || '0'),
      video_p75_watched_actions: parseInt(insights.video_p75_watched_actions || '0'),
      video_p100_watched_actions: parseInt(insights.video_p100_watched_actions || '0'),
      actions: insights.actions || [],
      action_values: insights.action_values || [],
      date_start: insights.date_start,
      date_stop: insights.date_stop,
      breakdowns: insights.breakdowns || {},
    };

    return NextResponse.json({
      insights: transformedInsights,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ad insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

