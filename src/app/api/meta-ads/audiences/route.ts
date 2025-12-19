/**
 * Meta Ads Audiences Endpoint
 * GET /api/meta-ads/audiences - List audiences
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
          message: 'Please connect your Meta Ads account to view audiences.'
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

    // Generate appsecret_proof for secure API calls
    const appSecretProof = generateAppSecretProof(accessToken);
    const authParams = `access_token=${accessToken}${appSecretProof ? `&appsecret_proof=${appSecretProof}` : ''}`;

    // Fetch audiences from Meta API
    const audiencesResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/customaudiences?fields=id,name,description,subtype,approximate_count,retention_days,time_created,lookalike_spec&${authParams}`
    );

    if (!audiencesResponse.ok) {
      const errorData = await audiencesResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to fetch audiences from Meta API');
    }

    const audiencesData = await audiencesResponse.json();

    return NextResponse.json({
      audiences: audiencesData.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch audiences',
        message: error instanceof Error ? error.message : 'An unexpected error occurred while fetching audiences.'
      },
      { status: 500 }
    );
  }
}
