/**
 * Meta Ads Status Endpoint
 * GET /api/meta-ads/status
 * 
 * Returns connection status for Meta Ads
 * Uses unified MetaCredentialService to check all Meta platforms
 * Can use existing Facebook/Instagram credentials for Ads
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials, getMetaConnectionStatus, checkMetaAdsCapability } from '@/lib/meta/getCredentials';
import { META_API_BASE, generateAppSecretProof } from '@/lib/meta/apiUtils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isConnected: false }, { status: 401 });
    }

    // Get workspace
    let workspaceId: string;
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    } catch (error) {
      return NextResponse.json(
        { 
          isConnected: false,
          error: 'Failed to get workspace'
        },
        { status: 500 }
      );
    }

    // Get detailed connection status for all Meta platforms
    const connectionStatus = await getMetaConnectionStatus(workspaceId);
    
    // Get ads capability (checks if we can run ads with current credentials)
    const adsCapability = await checkMetaAdsCapability(workspaceId, user.id);

    // Get Meta Ads credentials (unified - checks meta_ads, facebook, instagram)
    const creds = await getMetaAdsCredentials(workspaceId, user.id);

    if (!creds?.access_token) {
      return NextResponse.json({
        isConnected: false,
        canRunAds: false,
        message: 'No Meta platform connected',
        platforms: connectionStatus,
        suggestion: 'Connect your Facebook account to enable Meta Ads',
      });
    }

    // Check if token is expired
    if (creds.is_expired) {
      return NextResponse.json({
        isConnected: false,
        canRunAds: false,
        tokenExpired: true,
        message: 'Your Meta connection has expired. Please reconnect.',
        platforms: connectionStatus,
      });
    }

    // If we have credentials but no ad account, try to fetch it
    let adAccountInfo = null;
    if (creds.account_id) {
      try {
        const appSecretProof = generateAppSecretProof(creds.access_token);
        const authParams = `access_token=${creds.access_token}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;
        const adAccountResponse = await fetch(
          `${META_API_BASE}/act_${creds.account_id}?fields=id,account_id,name,currency,timezone_name,amount_spent,balance&${authParams}`
        );

        if (adAccountResponse.ok) {
          const data = await adAccountResponse.json();
          adAccountInfo = {
            id: data.id,
            account_id: data.account_id,
            name: data.name,
            currency: data.currency || 'USD',
            timezone_name: data.timezone_name || 'America/Los_Angeles',
            amount_spent: data.amount_spent,
            balance: data.balance,
          };
        }
      } catch (apiError) {
      }
    }

    return NextResponse.json({
      isConnected: true,
      canRunAds: adsCapability.hasAdsAccess,
      tokenExpiresSoon: creds.expires_soon,
      expiresAt: creds.expires_at,
      // Ad Account info
      adAccount: adAccountInfo || {
        id: creds.account_id ? `act_${creds.account_id}` : null,
        account_id: creds.account_id,
        name: creds.account_name || 'Ad Account',
        currency: 'USD',
        timezone_name: 'America/Los_Angeles',
      },
      // Page info (required for ad publishing)
      page: creds.page_id ? {
        id: creds.page_id,
        name: creds.page_name,
      } : null,
      // Detailed platform status
      platforms: connectionStatus,
      // What's missing for ads (if anything)
      missingForAds: adsCapability.missingPermissions,
      // Helpful message
      message: adsCapability.hasAdsAccess 
        ? 'Ready to run Meta Ads' 
        : adsCapability.missingPermissions?.[0] || 'Additional setup required for ads',
    });
  } catch (error) {
    return NextResponse.json(
      { 
        isConnected: false,
        canRunAds: false,
        error: 'Failed to check Meta Ads status',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
