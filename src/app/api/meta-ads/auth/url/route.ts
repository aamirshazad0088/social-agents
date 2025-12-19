/**
 * Meta Ads OAuth URL Endpoint
 * GET /api/meta-ads/auth/url - Get OAuth authorization URL
 * 
 * Security: Generates and stores CSRF state token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const META_APP_ID = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
const REDIRECT_URI = process.env.META_ADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/meta-ads/auth/callback`;

export async function GET(request: NextRequest) {
  try {
    if (!META_APP_ID) {
      return NextResponse.json(
        { error: 'Meta App ID not configured. Please set META_APP_ID environment variable.' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to connect Meta Ads' },
        { status: 401 }
      );
    }

    // Generate secure CSRF state
    const state = crypto.randomUUID();

    // Store state for validation in callback
    await (supabase.from('oauth_states') as any).insert({
      state,
      user_id: user.id,
      platform: 'meta_ads',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
    });

    // Meta Marketing API required scopes
    const scopes = [
      'ads_management',
      'ads_read',
      'business_management',
      'pages_read_engagement',
      'pages_show_list',
      'pages_manage_ads',
    ].join(',');

    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&state=${state}`;

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
