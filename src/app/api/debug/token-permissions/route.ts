/**
 * Debug API: Check Facebook/Instagram Token Permissions
 * 
 * GET /api/debug/token-permissions
 * 
 * This endpoint helps diagnose permission issues by showing:
 * - What permissions are granted to your current token
 * - Whether App Review is needed for specific permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { CredentialService } from '@/services/database/credentialService';
import { createHmac } from 'crypto';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function generateAppSecretProof(accessToken: string): string {
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
  if (!appSecret) return '';
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await supabase.rpc('get_my_profile');
    const profileData: any = Array.isArray(profile) ? profile[0] : profile;
    const workspaceId = profileData?.workspace_id;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    // Get Facebook credentials
    const facebookCreds = await CredentialService.getPlatformCredentials(
      'facebook',
      user.id,
      workspaceId
    );

    if (!facebookCreds?.accessToken) {
      return NextResponse.json({ 
        error: 'No Facebook token found. Please connect your Facebook account first.',
        suggestion: 'Go to Settings → Accounts → Connect Facebook'
      }, { status: 400 });
    }

    const accessToken = facebookCreds.accessToken;
    const proof = generateAppSecretProof(accessToken);

    // 1. Get token permissions
    const permissionsUrl = `${GRAPH_API_BASE}/me/permissions?access_token=${accessToken}&appsecret_proof=${proof}`;
    const permissionsResponse = await fetch(permissionsUrl);
    const permissionsData = await permissionsResponse.json();

    // 2. Debug the token itself
    const debugUrl = `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${process.env.FACEBOOK_CLIENT_ID}|${process.env.FACEBOOK_CLIENT_SECRET}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    // Analyze permissions
    const grantedPermissions = permissionsData.data?.filter((p: any) => p.status === 'granted').map((p: any) => p.permission) || [];
    const declinedPermissions = permissionsData.data?.filter((p: any) => p.status === 'declined').map((p: any) => p.permission) || [];

    // Required permissions for different features
    const requiredForFacebook = ['pages_read_engagement', 'pages_manage_posts', 'pages_show_list'];
    const requiredForInstagram = ['instagram_basic', 'instagram_manage_comments', 'instagram_manage_insights'];

    const missingForFacebook = requiredForFacebook.filter(p => !grantedPermissions.includes(p));
    const missingForInstagram = requiredForInstagram.filter(p => !grantedPermissions.includes(p));

    // Check if this is a Page token or User token
    const tokenType = debugData.data?.type || 'unknown';
    const isPageToken = tokenType === 'PAGE';
    const appId = debugData.data?.app_id;
    const expiresAt = debugData.data?.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : 'never';

    return NextResponse.json({
      success: true,
      tokenInfo: {
        type: tokenType,
        isPageToken,
        appId,
        expiresAt,
        pageId: facebookCreds.pageId,
        pageName: facebookCreds.pageName,
      },
      permissions: {
        granted: grantedPermissions,
        declined: declinedPermissions,
        total: grantedPermissions.length,
      },
      analysis: {
        facebookPosts: {
          canReadPosts: grantedPermissions.includes('pages_read_engagement'),
          missingPermissions: missingForFacebook,
          status: missingForFacebook.length === 0 ? '✅ Ready' : '❌ Missing permissions',
          fix: missingForFacebook.includes('pages_read_engagement') 
            ? 'pages_read_engagement requires Facebook App Review. Go to Facebook Developer Console → App Review → Permissions and Features → Request pages_read_engagement'
            : null,
        },
        instagramPosts: {
          canReadPosts: grantedPermissions.includes('instagram_basic'),
          missingPermissions: missingForInstagram,
          status: missingForInstagram.length === 0 ? '✅ Ready' : '❌ Missing permissions',
        },
      },
      appReviewRequired: {
        'pages_read_engagement': 'Required for reading Facebook Page posts',
        'pages_manage_posts': 'Required for creating posts on Facebook Pages',
        'instagram_basic': 'Works in development mode for your own account',
        'instagram_manage_comments': 'Works in development mode for your own account',
      },
      nextSteps: missingForFacebook.includes('pages_read_engagement') ? [
        '1. Go to https://developers.facebook.com/apps/',
        '2. Select your app',
        '3. Go to "App Review" → "Permissions and Features"',
        '4. Find "pages_read_engagement" and click "Request"',
        '5. Submit required documentation for review',
        '',
        'Alternative (for development/testing):',
        '1. Go to your app → "App Roles" → "Roles"',
        '2. Add yourself as Admin or Tester',
        '3. Ensure you are also an Admin of the Facebook Page',
        '4. Reconnect your Facebook account in Settings',
      ] : ['All required permissions are granted!'],
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
