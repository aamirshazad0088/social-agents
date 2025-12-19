/**
 * Delete/Hide Comment API
 * POST /api/comments/delete - Delete or hide a comment from the platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { CredentialService } from '@/services/database';
import { createHmac } from 'crypto';

interface UserData {
  workspace_id: string;
}

const GRAPH_API_VERSION = 'v24.0';

function generateAppSecretProof(accessToken: string): string {
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
  if (!appSecret) return '';
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { commentId, pendingId, platform } = body;

    if (!commentId || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: commentId, platform' },
        { status: 400 }
      );
    }

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single() as { data: UserData | null };

    if (!userData?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get platform credentials
    const credentials = await CredentialService.getPlatformCredentials(
      platform,
      user.id,
      userData.workspace_id
    );

    if (!credentials?.accessToken) {
      return NextResponse.json(
        { error: `${platform} not connected` },
        { status: 400 }
      );
    }


    const proof = generateAppSecretProof(credentials.accessToken);
    let hidden = false;

    // Try to delete the comment first
    // Note: You can only delete comments on your own posts
    let deleteUrl = `${GRAPH_API_BASE}/${commentId}?access_token=${credentials.accessToken}`;
    if (proof) {
      deleteUrl += `&appsecret_proof=${proof}`;
    }

    const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });

    if (!deleteResponse.ok) {
      // If delete fails, try hiding instead

      const hideParams = new URLSearchParams({
        hide: 'true',
        access_token: credentials.accessToken,
      });
      if (proof) {
        hideParams.append('appsecret_proof', proof);
      }

      const hideResponse = await fetch(`${GRAPH_API_BASE}/${commentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: hideParams,
      });

      if (!hideResponse.ok) {
        const error = await hideResponse.json();
        return NextResponse.json(
          { error: error.error?.message || 'Failed to delete or hide comment' },
          { status: 400 }
        );
      }

      hidden = true;
    } else {
    }

    // Update pending comment status if pendingId provided
    if (pendingId) {
      const { error: updateError } = await (supabase
        .from('pending_comments') as any)
        .update({
          status: 'deleted',
        })
        .eq('id', pendingId)
        .eq('workspace_id', userData.workspace_id);

      if (updateError) {
      }
    }

    return NextResponse.json({
      success: true,
      hidden,
      message: hidden ? 'Comment hidden' : 'Comment deleted',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
