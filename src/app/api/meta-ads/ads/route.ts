/**
 * Meta Ads Ads Endpoint
 * GET /api/meta-ads/ads - List ads
 * POST /api/meta-ads/ads - Create ad
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { uploadAdImage, uploadAdVideo } from '@/lib/meta/adLibrary';
import { buildAdCreative } from '@/lib/meta/adCreative';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';
import { META_API_BASE, generateAppSecretProof } from '@/lib/meta/apiUtils';
import { CreateAdSchema } from '@/lib/validation/schemas/metaAds';
import type { AdCreative } from '@/types/metaAds';

/**
 * GET /api/meta-ads/ads
 * List all ads for the ad account
 */
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
          message: 'Unable to retrieve workspace information. Please try again.'
        },
        { status: 500 }
      );
    }

    // Get Meta credentials using helper function
    const creds = await getMetaAdsCredentials(workspaceId, user.id);
    
    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to view ads.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);
    const authParams = `access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

    // Fetch ads from Meta API
    const adsResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/ads?` +
      `fields=id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,` +
      `creative{id,name,object_story_spec},` +
      `insights{impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,conversions,cost_per_conversion}` +
      `&${authParams}`
    );

    if (!adsResponse.ok) {
      const errorData = await adsResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to fetch ads from Meta API');
    }

    const adsData = await adsResponse.json();
    
    // Transform Meta API response to our format
    const ads = (adsData.data || []).map((ad: any) => transformAdFromMeta(ad));

    return NextResponse.json({ ads });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch ads',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while fetching ads.'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta-ads/ads
 * Create a new ad
 * 
 * Body: {
 *   name: string,
 *   adset_id: string,
 *   status: 'ACTIVE' | 'PAUSED',
 *   creative: {
 *     title?: string,
 *     body?: string,
 *     call_to_action_type?: CallToActionType,
 *     link_url?: string,
 *     image_url?: string,
 *     video_id?: string,
 *     image_hash?: string,
 *     // For carousel
 *     carousel_items?: Array<{
 *       image_url: string,
 *       title?: string,
 *       description?: string,
 *       link?: string,
 *     }>
 *   },
 *   page_id?: string, // Required for ad creation
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = CreateAdSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, adset_id, status, creative, page_id } = validationResult.data;

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to get workspace',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Get Meta credentials using helper function
    const creds = await getMetaAdsCredentials(workspaceId, user.id);
    
    if (!creds?.access_token) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account to create ads.'
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

    // Get page_id from credentials or request
    let finalPageId: string | undefined = page_id || creds.page_id;
    
    if (!finalPageId) {
      // Try to get from Facebook credentials in social_accounts
      const { data: fbCreds } = await supabase
        .from('social_accounts')
        .select('page_id')
        .eq('workspace_id', workspaceId)
        .eq('platform', 'facebook')
        .maybeSingle();
      
      if (fbCreds && (fbCreds as any).page_id) {
        finalPageId = (fbCreds as any).page_id;
      }
    }

    if (!finalPageId) {
      return NextResponse.json(
        { error: 'page_id is required. Please connect a Facebook Page or provide page_id in request.' },
        { status: 400 }
      );
    }

    // Step 1: Upload media to Ad Library if needed
    let imageHash: string | undefined;
    let videoId: string | undefined;
    let assetFeedSpec: any = undefined;

    // Handle carousel ads
    if (creative.carousel_items && creative.carousel_items.length > 0) {
      // Upload all carousel images
      const imageHashes = await Promise.all(
        creative.carousel_items.map(async (item: any) => {
          const imageUrl: string | undefined = item.image_url;
          if (imageUrl) {
            try {
              const result = await uploadAdImage(accountId, accessToken, imageUrl as string, item.title || undefined);
              return result.hash;
            } catch (error) {
              throw error;
            }
          }
          return null;
        })
      );

      // Build asset feed spec for carousel
      assetFeedSpec = {
        images: imageHashes.filter(Boolean).map((hash: string | null) => ({ hash: hash! })),
        titles: creative.carousel_items.map((item: any) => ({ text: item.title || '' })),
        descriptions: creative.carousel_items.map((item: any) => ({ text: item.description || '' })),
        link_urls: creative.carousel_items.map((item: any) => ({ website_url: item.link || creative.link_url || '' })),
        call_to_action_types: creative.carousel_items.map(() => creative.call_to_action_type || 'LEARN_MORE'),
      };
    } else if (creative.image_url && !creative.image_hash) {
      // Upload single image
      const imageUrl: string = creative.image_url;
      try {
        const result = await uploadAdImage(accountId, accessToken, imageUrl, creative.title);
        imageHash = result.hash;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to upload image to Ad Library', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (creative.image_hash) {
      imageHash = creative.image_hash;
    }

    // Handle video upload (if video_url is provided in request body, not in validated creative)
    const bodyData = body as any;
    const videoUrl: string | undefined = bodyData.creative?.video_url;
    if (videoUrl && !creative.video_id) {
      try {
        const result = await uploadAdVideo(
          accountId,
          accessToken,
          videoUrl as string,
          creative.title,
          creative.body
        );
        videoId = result.video_id;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to upload video to Ad Library', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (creative.video_id) {
      videoId = creative.video_id;
    }

    // Step 2: Create ad creative
    const adCreative: AdCreative = {
      name: `${name} - Creative`,
      title: creative.title,
      body: creative.body,
      call_to_action_type: creative.call_to_action_type,
      link_url: creative.link_url,
      image_hash: imageHash,
      image_url: creative.image_url,
      video_id: videoId,
      asset_feed_spec: assetFeedSpec,
    };

    // Build object_story_spec
    if (!finalPageId) {
      return NextResponse.json(
        { error: 'page_id is required. Please connect a Facebook Page or provide page_id in request.' },
        { status: 400 }
      );
    }
    
    const creativeSpec = buildAdCreative(finalPageId, adCreative);

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);

    // Create ad creative via Meta API
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
      throw new Error(error.error?.message || 'Failed to create ad creative');
    }

    const creativeResult = await creativeResponse.json();
    const creativeId = creativeResult.id;

    // Step 3: Create ad
    const adResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/ads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          adset_id,
          status: status || 'PAUSED',
          creative: { creative_id: creativeId },
          access_token: accessToken,
          ...(appSecretProof && { appsecret_proof: appSecretProof }),
        }),
      }
    );

    if (!adResponse.ok) {
      const error = await adResponse.json();
      throw new Error(error.error?.message || 'Failed to create ad');
    }

    const adResult = await adResponse.json();

    // Fetch complete ad data
    const adDataResponse = await fetch(
      `${META_API_BASE}/${adResult.id}?fields=id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,creative&access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`
    );

    const adData = await adDataResponse.json();
    const transformedAd = transformAdFromMeta(adData);

    // Store ad in database for audit trail
    try {
      const { error: dbError } = await supabase
        .from('meta_ads')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          meta_ad_id: transformedAd.id,
          meta_creative_id: transformedAd.creative.id,
          meta_adset_id: transformedAd.adset_id,
          meta_campaign_id: transformedAd.campaign_id,
          name: transformedAd.name,
          status: transformedAd.status,
          effective_status: transformedAd.effective_status,
          creative: transformedAd.creative,
          insights: transformedAd.insights,
          last_synced_at: new Date().toISOString(),
        } as any);

      if (dbError) {
        // Don't fail the request if DB storage fails, but log it
      } else {
        // Log activity
        try {
          await supabase
            .from('activity_logs')
            .insert({
              workspace_id: workspaceId,
              user_id: user.id,
              action: 'ad_created',
              resource_type: 'meta_ad',
              resource_id: transformedAd.id,
              details: {
                ad_name: transformedAd.name,
                adset_id: transformedAd.adset_id,
                campaign_id: transformedAd.campaign_id,
              },
            } as any);
        } catch (logError) {
        }
      }
    } catch (dbError) {
      // Continue even if DB storage fails
    }

    return NextResponse.json({
      success: true,
      ad: transformedAd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create ad', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Transform Meta API ad format to our format
 */
function transformAdFromMeta(metaAd: any) {
  const creative = metaAd.creative || {};
  const objectStorySpec = creative.object_story_spec || {};
  const linkData = objectStorySpec.link_data || {};
  const videoData = objectStorySpec.video_data || {};
  const photoData = objectStorySpec.photo_data || {};

  return {
    id: metaAd.id,
    name: metaAd.name,
    adset_id: metaAd.adset_id,
    campaign_id: metaAd.campaign_id,
    status: metaAd.status,
    effective_status: metaAd.effective_status,
    created_time: metaAd.created_time,
    updated_time: metaAd.updated_time,
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
    insights: metaAd.insights ? {
      impressions: metaAd.insights.impressions || 0,
      reach: metaAd.insights.reach || 0,
      clicks: metaAd.insights.clicks || 0,
      spend: metaAd.insights.spend || 0,
      cpc: metaAd.insights.cpc || 0,
      cpm: metaAd.insights.cpm || 0,
      ctr: metaAd.insights.ctr || 0,
      frequency: metaAd.insights.frequency || 0,
      conversions: metaAd.insights.conversions || 0,
      cost_per_conversion: metaAd.insights.cost_per_conversion || 0,
    } : undefined,
  };
}

