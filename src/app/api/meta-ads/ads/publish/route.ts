/**
 * Meta Ads Publish Endpoint
 * POST /api/meta-ads/ads/publish - Publish ad draft (creates Campaign → AdSet → Ad)
 * 
 * This endpoint handles the complete workflow of publishing an ad from a draft:
 * 1. Creates a new Campaign with the specified objective
 * 2. Creates an AdSet with targeting, budget, and schedule
 * 3. Creates the Ad with creative content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import { uploadAdImage, uploadAdVideo } from '@/lib/meta/adLibrary';
import { buildAdCreative } from '@/lib/meta/adCreative';
import { META_API_BASE, generateAppSecretProof } from '@/lib/meta/apiUtils';
import type { AdCreative } from '@/types/metaAds';

interface PublishAdRequest {
  draftId?: string;
  campaignName: string;
  adSetName?: string;
  adName?: string;
  objective: string;
  optimizationGoal: string;
  billingEvent?: string;
  platform: 'facebook' | 'instagram' | 'both';
  status?: 'ACTIVE' | 'PAUSED';
  creative: {
    headline: string;
    primary_text: string;
    call_to_action: string;
    destination_url: string;
    media_url: string;
    media_type: 'image' | 'video';
    additional_urls?: string[];
  };
  targeting: {
    locations: string[];
    ageMin: number;
    ageMax: number;
    genders: string[];
    interests?: string[];
    customAudiences?: string[];
  };
  budget: {
    type: 'daily' | 'lifetime';
    amount: number;
    currency: string;
  };
  schedule?: {
    startDate: string;
    endDate?: string;
    runContinuously: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PublishAdRequest = await request.json();

    // Validate required fields
    if (!body.campaignName || !body.objective || !body.creative) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignName, objective, and creative are required' },
        { status: 400 }
      );
    }

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get workspace' },
        { status: 500 }
      );
    }

    // Get Meta credentials
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to publish ads.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Ad account ID is missing. Please reconnect your Meta Ads account.' },
        { status: 400 }
      );
    }

    // Get page_id from credentials
    let pageId: string | undefined = creds.page_id;
    
    if (!pageId) {
      // Try to get from Facebook credentials in social_accounts
      const { data: fbCreds } = await supabase
        .from('social_accounts')
        .select('page_id')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      if (fbCreds && (fbCreds as any).page_id) {
        pageId = (fbCreds as any).page_id;
      }
    }

    if (!pageId) {
      return NextResponse.json(
        { error: 'Facebook Page not connected. Please connect a Facebook Page to publish ads.' },
        { status: 400 }
      );
    }

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);

    // =========================================================================
    // Step 1: Create Campaign
    // =========================================================================
    
    const campaignPayload: Record<string, any> = {
      name: body.campaignName,
      objective: body.objective,
      status: body.status || 'PAUSED',
      special_ad_categories: [],
      access_token: accessToken,
      ...(appSecretProof && { appsecret_proof: appSecretProof }),
    };

    const campaignResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload),
      }
    );

    if (!campaignResponse.ok) {
      const error = await campaignResponse.json();
      return NextResponse.json(
        { 
          error: 'Failed to create campaign',
          message: error.error?.message || 'Unknown error',
          details: error.error
        },
        { status: 500 }
      );
    }

    const campaignResult = await campaignResponse.json();
    const campaignId = campaignResult.id;

    // =========================================================================
    // Step 2: Create Ad Set
    // =========================================================================

    // Build targeting spec for Meta API
    const targetingSpec: Record<string, any> = {
      geo_locations: {
        countries: body.targeting.locations || ['US'],
      },
      age_min: body.targeting.ageMin || 18,
      age_max: body.targeting.ageMax || 65,
    };

    // Add gender targeting
    if (body.targeting.genders && body.targeting.genders.length > 0) {
      const genderValue = body.targeting.genders[0];
      if (genderValue === 'male') {
        targetingSpec.genders = [1];
      } else if (genderValue === 'female') {
        targetingSpec.genders = [2];
      }
      // 'all' means no gender filter
    }

    // Add publisher platforms based on platform selection
    if (body.platform === 'facebook') {
      targetingSpec.publisher_platforms = ['facebook'];
    } else if (body.platform === 'instagram') {
      targetingSpec.publisher_platforms = ['instagram'];
    } else {
      targetingSpec.publisher_platforms = ['facebook', 'instagram'];
    }

    // Build ad set payload
    const adSetPayload: Record<string, any> = {
      name: body.adSetName || `${body.campaignName} - Ad Set`,
      campaign_id: campaignId,
      optimization_goal: body.optimizationGoal || 'LINK_CLICKS',
      billing_event: body.billingEvent || 'IMPRESSIONS',
      targeting: targetingSpec,
      status: body.status || 'PAUSED',
      access_token: accessToken,
      ...(appSecretProof && { appsecret_proof: appSecretProof }),
    };

    // Add budget (convert to cents)
    if (body.budget.type === 'daily') {
      adSetPayload.daily_budget = Math.round(body.budget.amount * 100);
    } else {
      adSetPayload.lifetime_budget = Math.round(body.budget.amount * 100);
    }

    // Add schedule
    if (body.schedule) {
      const startTime = new Date(body.schedule.startDate);
      adSetPayload.start_time = startTime.toISOString();
      
      if (!body.schedule.runContinuously && body.schedule.endDate) {
        const endTime = new Date(body.schedule.endDate);
        adSetPayload.end_time = endTime.toISOString();
      }
    }

    const adSetResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/adsets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adSetPayload),
      }
    );

    if (!adSetResponse.ok) {
      const error = await adSetResponse.json();
      
      // Clean up: delete the campaign we just created
      try {
        await fetch(`${META_API_BASE}/${campaignId}?access_token=${accessToken}`, {
          method: 'DELETE',
        });
      } catch (cleanupError) {
      }

      return NextResponse.json(
        { 
          error: 'Failed to create ad set',
          message: error.error?.message || 'Unknown error',
          details: error.error
        },
        { status: 500 }
      );
    }

    const adSetResult = await adSetResponse.json();
    const adSetId = adSetResult.id;

    // =========================================================================
    // Step 3: Upload Media to Ad Library
    // =========================================================================
    
    let imageHash: string | undefined;
    let videoId: string | undefined;

    if (body.creative.media_type === 'image' && body.creative.media_url) {
      try {
        const result = await uploadAdImage(
          accountId,
          accessToken,
          body.creative.media_url,
          body.creative.headline
        );
        imageHash = result.hash;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to upload image to Ad Library', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (body.creative.media_type === 'video' && body.creative.media_url) {
      try {
        const result = await uploadAdVideo(
          accountId,
          accessToken,
          body.creative.media_url,
          body.creative.headline,
          body.creative.primary_text
        );
        videoId = result.video_id;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to upload video to Ad Library', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // Step 4: Create Ad Creative
    // =========================================================================

    const adCreative: AdCreative = {
      name: `${body.adName || body.campaignName} - Creative`,
      title: body.creative.headline,
      body: body.creative.primary_text,
      call_to_action_type: body.creative.call_to_action as any,
      link_url: body.creative.destination_url,
      image_hash: imageHash,
      image_url: body.creative.media_url,
      video_id: videoId,
    };

    const creativeSpec = buildAdCreative(pageId, adCreative);

    const creativeResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/adcreatives`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adCreative.name,
          ...creativeSpec,
          access_token: accessToken,
          ...(appSecretProof && { appsecret_proof: appSecretProof }),
        }),
      }
    );

    if (!creativeResponse.ok) {
      const error = await creativeResponse.json();
      return NextResponse.json(
        { 
          error: 'Failed to create ad creative',
          message: error.error?.message || 'Unknown error',
          details: error.error
        },
        { status: 500 }
      );
    }

    const creativeResult = await creativeResponse.json();
    const creativeId = creativeResult.id;

    // =========================================================================
    // Step 5: Create Ad
    // =========================================================================

    const adResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/ads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: body.adName || `${body.campaignName} - Ad`,
          adset_id: adSetId,
          status: body.status || 'PAUSED',
          creative: { creative_id: creativeId },
          access_token: accessToken,
          ...(appSecretProof && { appsecret_proof: appSecretProof }),
        }),
      }
    );

    if (!adResponse.ok) {
      const error = await adResponse.json();
      return NextResponse.json(
        { 
          error: 'Failed to create ad',
          message: error.error?.message || 'Unknown error',
          details: error.error
        },
        { status: 500 }
      );
    }

    const adResult = await adResponse.json();

    // =========================================================================
    // Step 6: Update draft status if draftId provided
    // =========================================================================
    if (body.draftId) {
      try {
        await (supabase as any)
          .from('meta_ad_drafts')
          .update({ 
            status: 'published',
            meta_campaign_id: campaignId,
            meta_adset_id: adSetId,
            meta_ad_id: adResult.id,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.draftId);
      } catch (error) {
        // Don't fail the request if this fails
      }
    }

    // Log activity
    try {
      await (supabase as any)
        .from('activity_logs')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          action: 'ad_published',
          resource_type: 'meta_ad',
          resource_id: adResult.id,
          details: {
            campaign_id: campaignId,
            adset_id: adSetId,
            ad_id: adResult.id,
            campaign_name: body.campaignName,
            draft_id: body.draftId,
          },
        });
    } catch (logError) {
    }

    return NextResponse.json({
      success: true,
      message: 'Ad published successfully!',
      campaign: { id: campaignId, name: body.campaignName },
      adSet: { id: adSetId, name: body.adSetName || `${body.campaignName} - Ad Set` },
      ad: { id: adResult.id, name: body.adName || `${body.campaignName} - Ad` },
      creative: { id: creativeId },
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to publish ad',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
