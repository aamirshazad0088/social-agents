/**
 * Meta Ads Draft Endpoint
 * POST /api/meta-ads/ads/draft - Save ad creative to library (draft)
 * GET /api/meta-ads/ads/draft - Get all ad drafts for workspace
 * 
 * This is the simplified flow from SendToAdModal:
 * - User creates ad creative from generated content
 * - Saves to library for later assignment to campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';

export async function POST(request: NextRequest) {
  // Parse body first
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { adConfig } = body;

  if (!adConfig) {
    return NextResponse.json({ error: 'Missing required field: adConfig' }, { status: 400 });
  }

  // Validate required creative fields
  if (!adConfig.headline || !adConfig.destinationUrl) {
    return NextResponse.json({ 
      error: 'Missing required fields: headline and destinationUrl are required' 
    }, { status: 400 });
  }

  // Get user and workspace
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let workspaceId: string;
  try {
    workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 });
  }

  // Build ad name
  const adName = adConfig.adName || adConfig.headline || 'Untitled Ad';

  // Build creative JSONB object (simplified - just what's needed)
  const creativeData = {
    headline: adConfig.headline || '',
    primary_text: adConfig.primaryText || '',
    call_to_action: adConfig.callToAction || 'LEARN_MORE',
    destination_url: adConfig.destinationUrl || '',
    media_url: adConfig.media?.url || '',
    media_type: adConfig.media?.type || 'image',
    additional_urls: adConfig.media?.additionalUrls || [],
    ad_name: adName,
  };

  // Determine ad type from media
  let adType = 'single_image';
  if (adConfig.media?.additionalUrls && adConfig.media.additionalUrls.length > 0) {
    adType = 'carousel';
  } else if (adConfig.media?.type === 'video') {
    adType = 'single_video';
  }

  // Build draft object with only essential fields
  const cleanAdDraft = {
    workspace_id: workspaceId,
    user_id: user.id,
    platform: adConfig.platform || 'both',
    ad_type: adType,
    objective: null, // Will be set when assigned to campaign
    optimization_goal: null,
    billing_event: 'IMPRESSIONS',
    status: 'draft',
    creative: creativeData,
    targeting: null, // Will use campaign's ad set targeting
    budget: null, // Will use campaign's budget
    schedule: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };


  // Save to database
  const { data, error } = await supabase
    .from('meta_ad_drafts' as any)
    .insert(cleanAdDraft as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ 
      error: 'Failed to save ad to library',
      message: error.message 
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    draft: data,
    message: 'Ad saved to library successfully',
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

    // Get workspace if not provided
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId) {
      try {
        finalWorkspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
      } catch (error) {
        return NextResponse.json(
          { 
            error: 'Failed to get workspace',
            message: 'Unable to retrieve workspace information.'
          },
          { status: 500 }
        );
      }
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('meta_ad_drafts' as any)
      .select('*')
      .eq('workspace_id', finalWorkspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch ad drafts',
          message: error.message || 'Database error occurred'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ drafts: data || [] });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch ad drafts',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.'
      },
      { status: 500 }
    );
  }
}
