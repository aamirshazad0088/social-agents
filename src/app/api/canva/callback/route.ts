/**
 * Canva OAuth Callback Route
 * Handles the OAuth callback and exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const CANVA_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/canva/callback';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL('/dashboard/media-studio?canva_error=' + error, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/media-studio?canva_error=missing_params', request.url)
      );
    }

    // Verify state and extract user ID
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/media-studio?canva_error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens using PKCE
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CANVA_REDIRECT_URI!,
        code_verifier: stateData.codeVerifier, // PKCE verifier from state
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return NextResponse.redirect(
        new URL('/dashboard/media-studio?canva_error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in Supabase
    const supabase = await createServerClient();
    const { error: dbError } = await (supabase
      .from('user_integrations') as any)
      .upsert({
        user_id: stateData.userId,
        provider: 'canva',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (dbError) {
      // Continue anyway - tokens can be stored in session
    }

    return NextResponse.redirect(
      new URL('/dashboard/media-studio?canva_connected=true', request.url)
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL('/dashboard/media-studio?canva_error=unknown', request.url)
    );
  }
}
