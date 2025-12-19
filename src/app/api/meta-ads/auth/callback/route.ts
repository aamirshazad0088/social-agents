/**
 * Meta Ads OAuth Callback Endpoint
 * GET /api/meta-ads/auth/callback - Handle OAuth callback
 * 
 * Security: Validates CSRF state, encrypts credentials before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { encryptAndStoreCredentials } from '@/lib/encryption/CredentialEncryption';

const META_APP_ID = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.META_ADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/meta-ads/auth/callback`;
const META_API_VERSION = 'v24.0';

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  
  try {
    // Validate environment variables
    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=config_error', baseUrl));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/meta-ads?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=no_code', baseUrl));
    }

    // Get user first to validate state
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=not_authenticated', baseUrl));
    }

    // Validate CSRF state
    if (state) {
      const { data: storedState } = await supabase
        .from('oauth_states')
        .select('*')
        .eq('state', state)
        .eq('user_id', user.id)
        .single();

      if (!storedState) {
        return NextResponse.redirect(new URL('/dashboard/meta-ads?error=invalid_state', baseUrl));
      }

      // Delete used state
      await supabase.from('oauth_states').delete().eq('state', state);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=token_exchange_failed', baseUrl));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=no_token', baseUrl));
    }

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${accessToken}`
    );

    let finalToken = accessToken;
    let expiresIn = tokenData.expires_in || 3600;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      finalToken = longLivedData.access_token || finalToken;
      expiresIn = longLivedData.expires_in || 5184000; // ~60 days
    }

    // Get ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?` +
      `fields=id,account_id,name,currency,timezone_name` +
      `&access_token=${finalToken}`
    );

    let adAccount: any = null;
    if (adAccountsResponse.ok) {
      const adAccountsData = await adAccountsResponse.json();
      if (adAccountsData.data?.length > 0) {
        adAccount = adAccountsData.data[0];
      }
    }

    // Get Facebook Page for ad publishing
    let pageId: string | null = null;
    let pageName: string | null = null;
    const pagesResponse = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/me/accounts?` +
      `fields=id,name,access_token` +
      `&access_token=${finalToken}`
    );

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      if (pagesData.data?.length > 0) {
        pageId = pagesData.data[0].id;
        pageName = pagesData.data[0].name;
      }
    }

    const workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt credentials before storage
    const encryptedCredentials = encryptAndStoreCredentials({
      platform: 'facebook', // Use facebook as base platform type
      accessToken: finalToken,
      userId: user.id,
      expiresAt: new Date(expiresAt),
      additionalData: {
        account_id: adAccount?.account_id,
        account_name: adAccount?.name,
        currency: adAccount?.currency,
        timezone: adAccount?.timezone_name,
        page_id: pageId,
        page_name: pageName,
      },
    }, workspaceId);

    // Store in social_accounts table (consistent with getMetaAdsCredentials)
    const { error: upsertError } = await (supabase
      .from('social_accounts') as any)
      .upsert({
        workspace_id: workspaceId,
        platform: 'meta_ads',
        account_id: adAccount?.account_id,
        account_name: adAccount?.name || 'Meta Ads Account',
        credentials_encrypted: encryptedCredentials,
        page_id: pageId,
        page_name: pageName,
        expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workspace_id,platform',
      });

    if (upsertError) {
      return NextResponse.redirect(new URL('/dashboard/meta-ads?error=storage_failed', baseUrl));
    }

    // Log successful connection
    try {
      await (supabase.from('activity_logs') as any).insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'meta_ads_connected',
        resource_type: 'social_account',
        resource_id: adAccount?.account_id || 'unknown',
        details: {
          account_name: adAccount?.name,
          has_page: !!pageId,
        },
      });
    } catch {
      // Don't fail if logging fails
    }

    return NextResponse.redirect(new URL('/dashboard/meta-ads?connected=true', baseUrl));
  } catch (error) {
    return NextResponse.redirect(new URL('/dashboard/meta-ads?error=callback_failed', baseUrl));
  }
}
