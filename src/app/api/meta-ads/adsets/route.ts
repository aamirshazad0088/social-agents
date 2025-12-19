/**
 * Meta Ads Ad Sets Endpoint - v24.0
 * Simplified and properly structured based on Meta Marketing API documentation
 * 
 * @see https://developers.facebook.com/docs/marketing-api/reference/ad-account/adsets
 * @see https://developers.facebook.com/docs/marketing-api/adset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import { META_API_BASE, generateAppSecretProof } from '@/lib/meta/apiUtils';

// ============================================
// CONFIGURATION MAPS
// ============================================

/**
 * Optimization goals and their valid billing events
 * Based on Meta Marketing API v24.0 documentation
 */
const OPTIMIZATION_TO_BILLING: Record<string, string> = {
  'REACH': 'IMPRESSIONS',
  'IMPRESSIONS': 'IMPRESSIONS',
  'LINK_CLICKS': 'IMPRESSIONS',
  'LANDING_PAGE_VIEWS': 'IMPRESSIONS',
  'POST_ENGAGEMENT': 'IMPRESSIONS',
  'VIDEO_VIEWS': 'IMPRESSIONS',
  'THRUPLAY': 'IMPRESSIONS',
  'LEAD_GENERATION': 'IMPRESSIONS',
  'OFFSITE_CONVERSIONS': 'IMPRESSIONS',
  'APP_INSTALLS': 'IMPRESSIONS',
  'CONVERSATIONS': 'IMPRESSIONS',
  'QUALITY_CALL': 'IMPRESSIONS',
  'QUALITY_LEAD': 'IMPRESSIONS',
  'VALUE': 'IMPRESSIONS',
};

/**
 * Campaign objectives mapped to their VALID optimization goals
 * First goal is the default, rest are alternatives
 * Based on Meta Marketing API v24.0 documentation
 */
const OBJECTIVE_VALID_GOALS: Record<string, string[]> = {
  // New OUTCOME-based objectives (v17.0+)
  'OUTCOME_AWARENESS': ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT'],
  'OUTCOME_TRAFFIC': ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'REACH', 'IMPRESSIONS'],
  'OUTCOME_ENGAGEMENT': ['POST_ENGAGEMENT', 'THRUPLAY', 'VIDEO_VIEWS', 'LINK_CLICKS'],
  'OUTCOME_LEADS': ['LEAD_GENERATION', 'CONVERSATIONS', 'LINK_CLICKS', 'QUALITY_LEAD'],
  'OUTCOME_SALES': ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'OFFSITE_CONVERSIONS', 'VALUE'],
  'OUTCOME_APP_PROMOTION': ['APP_INSTALLS', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS'],
  // Legacy objectives (for backwards compatibility)
  'BRAND_AWARENESS': ['AD_RECALL_LIFT', 'REACH'],
  'REACH': ['REACH', 'IMPRESSIONS'],
  'LINK_CLICKS': ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS'],
  'POST_ENGAGEMENT': ['POST_ENGAGEMENT', 'IMPRESSIONS', 'LINK_CLICKS'],
  'VIDEO_VIEWS': ['THRUPLAY', 'VIDEO_VIEWS'],
  'LEAD_GENERATION': ['LEAD_GENERATION', 'LINK_CLICKS', 'QUALITY_LEAD'],
  'MESSAGES': ['CONVERSATIONS', 'LINK_CLICKS', 'LEAD_GENERATION'],
  'CONVERSIONS': ['OFFSITE_CONVERSIONS', 'VALUE', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'],
  'PRODUCT_CATALOG_SALES': ['OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'VALUE'],
  'APP_INSTALLS': ['APP_INSTALLS', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS'],
};

// Helper to get default goal for an objective
const getDefaultGoal = (objective: string): string => {
  return OBJECTIVE_VALID_GOALS[objective]?.[0] || 'LINK_CLICKS';
};

// Helper to validate goal for objective
const isValidGoalForObjective = (objective: string, goal: string): boolean => {
  const validGoals = OBJECTIVE_VALID_GOALS[objective];
  return validGoals ? validGoals.includes(goal) : true;
};

/**
 * Bid strategies that require bid_amount
 */
const STRATEGIES_REQUIRING_BID_AMOUNT = [
  'LOWEST_COST_WITH_BID_CAP',
  'COST_CAP',
  'LOWEST_COST_WITH_MIN_ROAS',
];

// ============================================
// GET HANDLER - List Ad Sets
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace and credentials
    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token || !creds?.account_id) {
      return NextResponse.json(
        { error: 'Meta Ads not connected', message: 'Please connect your Meta Ads account.' },
        { status: 401 }
      );
    }

    const { account_id, access_token } = creds;
    const appSecretProof = generateAppSecretProof(access_token);
    const authParams = `access_token=${access_token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

    // Fetch ad sets with all relevant fields
    const response = await fetch(
      `${META_API_BASE}/act_${account_id}/adsets?fields=` +
      `id,name,campaign_id,status,effective_status,` +
      `optimization_goal,billing_event,bid_strategy,bid_amount,` +
      `daily_budget,lifetime_budget,budget_remaining,` +
      `start_time,end_time,targeting,promoted_object,` +
      `created_time,updated_time,` +
      `insights{impressions,reach,clicks,spend,cpc,cpm,ctr}` +
      `&limit=100&${authParams}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch ad sets');
    }

    const data = await response.json();
    return NextResponse.json({ adSets: data.data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch ad sets', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST HANDLER - Create Ad Set
// ============================================

export async function POST(request: NextRequest) {
  
  try {
    // 1. AUTH & SETUP
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token || !creds?.account_id) {
      return NextResponse.json(
        { error: 'Meta Ads not connected', message: 'Please connect your Meta Ads account.' },
        { status: 401 }
      );
    }

    const { account_id, access_token, page_id } = creds;
    const appSecretProof = generateAppSecretProof(access_token);

    // 2. PARSE REQUEST BODY
    const body = await request.json();

    // 3. VALIDATE REQUIRED FIELDS
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Ad set name is required' }, { status: 400 });
    }
    if (!body.campaign_id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // 4. FETCH CAMPAIGN DETAILS
    const authParams = `access_token=${access_token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;
    const campaignResponse = await fetch(
      `${META_API_BASE}/${body.campaign_id}?fields=id,name,objective,daily_budget,lifetime_budget,bid_strategy,smart_promotion_type&${authParams}`
    );
    
    if (!campaignResponse.ok) {
      const error = await campaignResponse.json();
      return NextResponse.json(
        { error: 'Invalid campaign', message: 'Could not find the specified campaign.' },
        { status: 400 }
      );
    }

    const campaign = await campaignResponse.json();

    // Determine campaign type
    // CBO = Campaign Budget Optimization (budget is set at campaign level, not ad set level)
    const hasCampaignBudget = !!(campaign.daily_budget || campaign.lifetime_budget);
    
    // Advantage+ is ONLY for campaigns with smart_promotion_type = AUTOMATED_SHOPPING_ADS
    // NOT all OUTCOME_SALES campaigns are Advantage+!
    const isAdvantagePlus = campaign.smart_promotion_type === 'AUTOMATED_SHOPPING_ADS';
    

    // 5. BUILD AD SET PAYLOAD
    // Following Meta API documentation: https://developers.facebook.com/docs/marketing-api/adset
    const payload: Record<string, string> = {
      name: body.name.trim(),
      campaign_id: body.campaign_id,
      status: body.status || 'PAUSED',
    };

    // Optimization goal (default based on campaign objective)
    // For OUTCOME_SALES without pixel, OFFSITE_CONVERSIONS won't work
    // So we use LINK_CLICKS as a safe fallback
    const hasPixel = body.promoted_object?.pixel_id || body.pixel_id;
    
    let defaultGoal = getDefaultGoal(campaign.objective);
    
    // If OUTCOME_SALES but no pixel, use LINK_CLICKS instead of OFFSITE_CONVERSIONS
    if (campaign.objective === 'OUTCOME_SALES' && !hasPixel) {
      defaultGoal = 'LINK_CLICKS';
    }
    
    // Use requested goal if valid for this objective, otherwise use default
    let optimizationGoal = defaultGoal;
    if (body.optimization_goal) {
      // If user requested OFFSITE_CONVERSIONS but has no pixel, fallback
      if (body.optimization_goal === 'OFFSITE_CONVERSIONS' && !hasPixel) {
        optimizationGoal = 'LINK_CLICKS';
      } else if (isValidGoalForObjective(campaign.objective, body.optimization_goal)) {
        optimizationGoal = body.optimization_goal;
      } else {
      }
    }
    
    payload.optimization_goal = optimizationGoal;

    // Billing event (determined by optimization goal)
    payload.billing_event = OPTIMIZATION_TO_BILLING[optimizationGoal] || 'IMPRESSIONS';

    // 6. TARGETING (REQUIRED)
    const targeting: Record<string, any> = {
      geo_locations: body.targeting?.geo_locations || { countries: ['US'] },
    };

    // Add optional targeting fields
    if (body.targeting?.age_min) targeting.age_min = body.targeting.age_min;
    if (body.targeting?.age_max) targeting.age_max = body.targeting.age_max;
    if (body.targeting?.genders?.length) targeting.genders = body.targeting.genders;
    if (body.targeting?.device_platforms?.length) targeting.device_platforms = body.targeting.device_platforms;
    if (body.targeting?.publisher_platforms?.length) targeting.publisher_platforms = body.targeting.publisher_platforms;
    if (body.targeting?.facebook_positions?.length) targeting.facebook_positions = body.targeting.facebook_positions;
    if (body.targeting?.instagram_positions?.length) targeting.instagram_positions = body.targeting.instagram_positions;
    if (body.targeting?.interests?.length) targeting.interests = body.targeting.interests;
    if (body.targeting?.behaviors?.length) targeting.behaviors = body.targeting.behaviors;
    if (body.targeting?.custom_audiences?.length) targeting.custom_audiences = body.targeting.custom_audiences;
    if (body.targeting?.excluded_custom_audiences?.length) targeting.excluded_custom_audiences = body.targeting.excluded_custom_audiences;

    payload.targeting = JSON.stringify(targeting);

    // 7. BUDGET (only for non-CBO campaigns)
    // If campaign has budget (CBO), ad set should NOT have budget
    if (!hasCampaignBudget && !isAdvantagePlus) {
      const budgetAmount = Math.round((body.budget_amount || 10) * 100); // Convert to cents
      if (body.budget_type === 'lifetime') {
        payload.lifetime_budget = String(budgetAmount);
      } else {
        payload.daily_budget = String(budgetAmount);
      }
    } else {
    }

    // 8. BID STRATEGY
    // For LOWEST_COST_WITHOUT_CAP: DO NOT send bid_strategy (Meta defaults to lowest cost)
    // For other strategies: may need bid_amount
    const requestedBidStrategy = body.bid_strategy;
    const campaignBidStrategy = campaign.bid_strategy;
    
    
    // Check if campaign's bid strategy requires bid_amount
    const campaignNeedsBidAmount = STRATEGIES_REQUIRING_BID_AMOUNT.includes(campaignBidStrategy);
    const adSetNeedsBidAmount = STRATEGIES_REQUIRING_BID_AMOUNT.includes(requestedBidStrategy);
    
    // If user explicitly chose a cap-based strategy, use it with bid_amount
    if (adSetNeedsBidAmount) {
      if (!body.bid_amount || body.bid_amount <= 0) {
        return NextResponse.json(
          { 
            error: 'Bid amount required',
            message: `The ${requestedBidStrategy === 'LOWEST_COST_WITH_BID_CAP' ? 'Bid Cap' : 'Cost Cap'} strategy requires a bid amount.`
          },
          { status: 400 }
        );
      }
      // Only set bid_strategy at ad set level if NOT using CBO
      if (!hasCampaignBudget) {
        payload.bid_strategy = requestedBidStrategy;
      }
      payload.bid_amount = String(Math.round(body.bid_amount * 100));
    }
    // If campaign has bid strategy requiring bid_amount but user chose lowest cost,
    // still need to provide bid_amount for the campaign's strategy
    else if (campaignNeedsBidAmount) {
      if (!body.bid_amount || body.bid_amount <= 0) {
        return NextResponse.json(
          { 
            error: 'Bid amount required',
            message: `Your campaign uses ${campaignBidStrategy === 'LOWEST_COST_WITH_BID_CAP' ? 'Bid Cap' : 'Cost Cap'} strategy which requires a bid amount for all ad sets.`
          },
          { status: 400 }
        );
      }
      payload.bid_amount = String(Math.round(body.bid_amount * 100));
    }
    // For LOWEST_COST_WITHOUT_CAP: DO NOT send bid_strategy
    // Meta defaults to automatic lowest cost when omitted

    // 9. PROMOTED OBJECT (for certain optimization goals)
    const goalsNeedingPromotedObject = ['OFFSITE_CONVERSIONS', 'LEAD_GENERATION', 'VALUE'];
    if (goalsNeedingPromotedObject.includes(optimizationGoal)) {
      if (body.promoted_object) {
        payload.promoted_object = JSON.stringify(body.promoted_object);
      } else if (page_id) {
        payload.promoted_object = JSON.stringify({ page_id });
      }
    }

    // 10. SCHEDULE
    if (body.start_time) {
      payload.start_time = new Date(body.start_time).toISOString();
    }
    if (body.end_time) {
      payload.end_time = new Date(body.end_time).toISOString();
    }

    // Add auth
    payload.access_token = access_token;
    if (appSecretProof) {
      payload.appsecret_proof = appSecretProof;
    }

    // 11. LOG FINAL PAYLOAD
    const debugPayload = { ...payload, access_token: '[REDACTED]', appsecret_proof: '[REDACTED]' };

    // 12. CREATE AD SET
    const createResponse = await fetch(
      `${META_API_BASE}/act_${account_id}/adsets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString(),
      }
    );

    const result = await createResponse.json();

    if (!createResponse.ok) {
      return NextResponse.json(
        { 
          error: result.error?.error_user_title || 'Failed to create ad set',
          message: result.error?.error_user_msg || result.error?.message || 'An error occurred'
        },
        { status: 400 }
      );
    }


    return NextResponse.json({
      success: true,
      adSet: result,
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create ad set',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
