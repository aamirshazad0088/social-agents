/**
 * Canva OAuth API Route
 * Handles authentication with Canva Connect API using PKCE
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CANVA_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/canva/callback';

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  // Generate a random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Create code challenge using SHA-256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * GET /api/canva/auth
 * Initiates Canva OAuth flow with PKCE
 */
export async function GET(request: NextRequest) {
  try {
    if (!CANVA_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Canva integration not configured. Add CANVA_CLIENT_ID to .env' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Generate state with PKCE verifier for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      codeVerifier, // Include verifier to use in callback
      timestamp: Date.now(),
    })).toString('base64');

    // Canva OAuth scopes (must match scopes enabled in Canva Developer Portal)
    const scopes = [
      'app:read',
      'app:write',
      'asset:read',
      'asset:write',
      'brandtemplate:content:read',
      'design:content:read',
      'design:content:write',
      'design:meta:read',  // Required to list designs
      'design:permission:read',
      'design:permission:write',
      'folder:read',
      'folder:write',
      'folder:permission:read',
      'folder:permission:write',
    ].join(' ');

    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    authUrl.searchParams.set('client_id', CANVA_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', CANVA_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate Canva auth' },
      { status: 500 }
    );
  }
}
