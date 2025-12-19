/**
 * Meta Ads Draft Individual Endpoint
 * PATCH /api/meta-ads/ads/draft/[id] - Update draft status
 * DELETE /api/meta-ads/ads/draft/[id] - Delete draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    const { id: draftId } = await params;
    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) updateData.status = body.status;
    if (body.meta_campaign_id) updateData.meta_campaign_id = body.meta_campaign_id;
    if (body.meta_adset_id) updateData.meta_adset_id = body.meta_adset_id;
    if (body.meta_ad_id) updateData.meta_ad_id = body.meta_ad_id;
    if (body.meta_creative_id) updateData.meta_creative_id = body.meta_creative_id;
    if (body.published_at) updateData.published_at = body.published_at;
    if (body.error_message !== undefined) updateData.error_message = body.error_message;

    const { error } = await (supabase
      .from('meta_ad_drafts') as any)
      .update(updateData)
      .eq('id', draftId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

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

    const { id: draftId } = await params;

    const { error } = await (supabase
      .from('meta_ad_drafts') as any)
      .delete()
      .eq('id', draftId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
