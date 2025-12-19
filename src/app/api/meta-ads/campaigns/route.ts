/**
 * Meta Ads Campaigns Endpoint
 * GET /api/meta-ads/campaigns - List campaigns
 * POST /api/meta-ads/campaigns - Create campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import { META_API_BASE, generateAppSecretProof } from '@/lib/meta/apiUtils';

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
          message: 'Please connect your Meta Ads account to view campaigns.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Ad account not configured', message: 'Please reconnect your Meta Ads account.' },
        { status: 400 }
      );
    }

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);
    const authParams = `access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

    // Fetch campaigns, ad sets, and ads in parallel
    // Note: When requesting insights inline, Facebook may return empty insights if no date_preset is provided
    // We'll fetch campaigns first without insights, then fetch insights separately if needed
    const [campaignsResponse, adSetsResponse, adsResponse] = await Promise.all([
      fetch(
        `${META_API_BASE}/act_${accountId}/campaigns?` +
        `fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,` +
        `buying_type,bid_strategy,special_ad_categories,created_time,updated_time,` +
        `insights{impressions,reach,clicks,spend,cpc,cpm,ctr}` +
        `&limit=100&${authParams}`
      ),
      fetch(
        `${META_API_BASE}/act_${accountId}/adsets?` +
        `fields=id,name,campaign_id,status,optimization_goal,billing_event,` +
        `daily_budget,lifetime_budget,targeting,created_time,updated_time,` +
        `insights{impressions,reach,clicks,spend,cpc,cpm,ctr}` +
        `&limit=100&${authParams}`
      ),
      fetch(
        `${META_API_BASE}/act_${accountId}/ads?` +
        `fields=id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,` +
        `creative{id,name,object_story_spec},` +
        `insights{impressions,reach,clicks,spend,cpc,cpm,ctr}` +
        `&limit=100&${authParams}`
      ),
    ]);

    // Parse responses
    let campaignsData: any = { data: [] };
    let adSetsData: any = { data: [] };
    let adsData: any = { data: [] };

    if (campaignsResponse.ok) {
      try {
        campaignsData = await campaignsResponse.json();
      } catch (error) {
      }
    } else {
      const error = await campaignsResponse.json().catch(() => ({}));
    }

    if (adSetsResponse.ok) {
      try {
        adSetsData = await adSetsResponse.json();
      } catch (error) {
      }
    }

    if (adsResponse.ok) {
      try {
        adsData = await adsResponse.json();
      } catch (error) {
      }
    }

    // Normalize insights data - Facebook returns insights as an array, take the first element
    const normalizeInsights = (insights: any): any => {
      if (!insights) return null;
      if (Array.isArray(insights) && insights.length > 0) {
        return insights[0];
      }
      return insights;
    };

    // Transform campaigns to ensure insights are properly structured
    const transformedCampaigns = (campaignsData.data || []).map((campaign: any) => ({
      ...campaign,
      insights: normalizeInsights(campaign.insights),
    }));

    const transformedAdSets = (adSetsData.data || []).map((adSet: any) => ({
      ...adSet,
      insights: normalizeInsights(adSet.insights),
    }));

    const transformedAds = (adsData.data || []).map((ad: any) => ({
      ...ad,
      insights: normalizeInsights(ad.insights),
    }));

    return NextResponse.json({
      campaigns: transformedCampaigns,
      adSets: transformedAdSets,
      ads: transformedAds,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaigns',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while fetching campaigns.'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

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
          message: 'Please connect your Meta Ads account to create campaigns.'
        },
        { status: 401 }
      );
    }

    // Create real campaign via Meta API
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

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);

    // Map legacy objectives to new OUTCOME-based objectives (API v24.0+)
    // See: https://developers.facebook.com/docs/marketing-api/adcampaign
    const objectiveMapping: Record<string, string> = {
      // Legacy to new mapping
      'LINK_CLICKS': 'OUTCOME_TRAFFIC',
      'TRAFFIC': 'OUTCOME_TRAFFIC',
      'CONVERSIONS': 'OUTCOME_SALES',
      'SALES': 'OUTCOME_SALES',
      'LEAD_GENERATION': 'OUTCOME_LEADS',
      'LEADS': 'OUTCOME_LEADS',
      'BRAND_AWARENESS': 'OUTCOME_AWARENESS',
      'AWARENESS': 'OUTCOME_AWARENESS',
      'REACH': 'OUTCOME_AWARENESS',
      'POST_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
      'ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
      'VIDEO_VIEWS': 'OUTCOME_ENGAGEMENT',
      'PAGE_LIKES': 'OUTCOME_ENGAGEMENT',
      'APP_INSTALLS': 'OUTCOME_APP_PROMOTION',
      'APP_PROMOTION': 'OUTCOME_APP_PROMOTION',
      'MESSAGES': 'OUTCOME_ENGAGEMENT',
      // New objectives (pass through)
      'OUTCOME_TRAFFIC': 'OUTCOME_TRAFFIC',
      'OUTCOME_SALES': 'OUTCOME_SALES',
      'OUTCOME_LEADS': 'OUTCOME_LEADS',
      'OUTCOME_AWARENESS': 'OUTCOME_AWARENESS',
      'OUTCOME_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
      'OUTCOME_APP_PROMOTION': 'OUTCOME_APP_PROMOTION',
    };

    const mappedObjective = objectiveMapping[body.objective?.toUpperCase()] || 'OUTCOME_TRAFFIC';

    // Build campaign payload - budget is typically set at ad set level, not campaign level
    // Only include budget if Campaign Budget Optimization is enabled
    const useCBO = body.campaign_budget_optimization || body.is_campaign_budget_optimization;
    
    const campaignPayload: Record<string, any> = {
      name: body.name,
      objective: mappedObjective,
      status: body.status || 'PAUSED',
      special_ad_categories: JSON.stringify(body.special_ad_categories || []),
      access_token: accessToken,
    };

    // Advantage+ is ONLY when explicitly creating with smart_promotion_type
    // Regular OUTCOME_SALES campaigns are NOT Advantage+
    const isAdvantagePlusCampaign = body.smart_promotion_type === 'AUTOMATED_SHOPPING_ADS';

    // Only add budget at campaign level if explicitly requested (Campaign Budget Optimization)
    if (useCBO && body.budget_amount) {
      if (body.budget_type === 'daily') {
        campaignPayload.daily_budget = Math.round(body.budget_amount * 100); // Convert to cents
      } else if (body.budget_type === 'lifetime') {
        campaignPayload.lifetime_budget = Math.round(body.budget_amount * 100);
      }
      // For CBO campaigns, only set bid_strategy if NOT Advantage+ and explicitly using a cap-based strategy
      // Advantage+ campaigns use automatic bidding managed by Meta
      const strategiesRequiringBidAmount = ['LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'];
      if (!isAdvantagePlusCampaign && body.bid_strategy && strategiesRequiringBidAmount.includes(body.bid_strategy)) {
        campaignPayload.bid_strategy = body.bid_strategy;
      }
      // For automatic bidding (LOWEST_COST_WITHOUT_CAP or not specified), just omit bid_strategy
      // Meta will use automatic lowest cost bidding by default
    } else {
      // When NOT using Campaign Budget Optimization, Meta API v24.0 requires
      // is_adset_budget_sharing_enabled to be specified
      // Setting to false means ad sets manage their own budgets independently
      campaignPayload.is_adset_budget_sharing_enabled = 'false';
    }
    

    if (appSecretProof) {
      campaignPayload.appsecret_proof = appSecretProof;
    }


    const createResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(campaignPayload).toString(),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error?.message || 'Failed to create campaign');
    }

    const result = await createResponse.json();

    return NextResponse.json({
      success: true,
      campaign: result,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create campaign',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating the campaign.'
      },
      { status: 500 }
    );
  }
}
