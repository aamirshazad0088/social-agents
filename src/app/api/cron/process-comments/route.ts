/**
 * Cron Job API Route: Process Comments
 *
 * Endpoint: GET/POST /api/cron/process-comments
 *
 * This endpoint is called hourly by external cron services (cron-job.org, Vercel Cron)
 * to automatically process and respond to comments on connected social media accounts.
 *
 * The AI agent will:
 * 1. Fetch recent posts with comments
 * 2. Search knowledge base for relevant info
 * 3. Auto-reply when confident
 * 4. Escalate to user when human expertise needed
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { processComments } from '@/agents/comment_agent/services/comment.service';
import { CredentialService } from '@/services/database/credentialService';
import { platformServiceFactory } from '@/services/PlatformServiceFactory';
import crypto from 'crypto';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Generate appsecret_proof for Meta API calls
 */
function generateAppSecretProof(accessToken: string): string {
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
  if (!appSecret) return '';
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

/**
 * Fetch Instagram Business Account ID from Facebook Page
 * This ensures we always have the correct IG account linked to the FB page
 */
async function getInstagramBusinessAccountId(
  pageId: string,
  pageAccessToken: string
): Promise<string | null> {
  try {
    const proof = generateAppSecretProof(pageAccessToken);
    const url = `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}&appsecret_proof=${proof}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const igAccountId = data.instagram_business_account?.id;
    
    if (igAccountId) {
    } else {
    }
    
    return igAccountId || null;
  } catch (error) {
    return null;
  }
}

// ============================================
// Configuration
// ============================================

const CONFIG = {
  MAX_WORKSPACES_PER_RUN: 2,  // Reduced to avoid timeout
  MAX_EXECUTION_TIME_MS: 50000, // 50 seconds max (Vercel limit is 60s)
  API_TIMEOUT_MS: 8000, // 8 second timeout per API call
  PLATFORMS: ['instagram', 'facebook', 'youtube'] as const,
} as const;

/**
 * Wrapper for API calls with timeout
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch {
    return fallback;
  }
}

// ============================================
// Types
// ============================================

interface SocialAccountRow {
  workspace_id: string;
  platform: string;
  is_connected: boolean;
  page_id: string | null;
}

interface WorkspaceCredentials {
  workspaceId: string;
  accessToken?: string;
  instagramUserId?: string;
  facebookPageId?: string;
  youtubeChannelId?: string;
}

// ============================================
// Supabase Admin Client
// ============================================

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabaseAdmin;
}

// ============================================
// Authentication
// ============================================

function verifyAuth(request: NextRequest): { authorized: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Development mode - allow without secret
  if (!cronSecret) {
    return { authorized: true };
  }

  // Check Bearer token
  if (authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // Check x-cron-secret header
  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret === cronSecret) {
    return { authorized: true };
  }

  return { authorized: false, error: 'Invalid or missing CRON_SECRET' };
}

// ============================================
// Main Handler
// ============================================

async function handleProcessComments(request: NextRequest) {
  const startTime = Date.now();

  // Helper to check if we're running out of time
  const isTimeRemaining = () => (Date.now() - startTime) < CONFIG.MAX_EXECUTION_TIME_MS;

  // Verify authentication
  const auth = verifyAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get workspaces with connected Instagram/Facebook accounts from social_accounts table
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('workspace_id, platform, is_connected, page_id')
      .in('platform', CONFIG.PLATFORMS)
      .eq('is_connected', true)
      .limit(CONFIG.MAX_WORKSPACES_PER_RUN * 2); // *2 because each workspace may have both platforms

    if (accountsError) {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connected accounts to process',
        workspaces: 0,
        totalAutoReplied: 0,
        totalEscalated: 0,
      });
    }

    // Get unique workspace IDs
    const workspaceIds = [...new Set((accounts as SocialAccountRow[]).map(a => a.workspace_id))];

    // Process each workspace
    const results = [];
    let totalAutoReplied = 0;
    let totalEscalated = 0;
    let totalErrors = 0;

    for (const workspaceId of workspaceIds.slice(0, CONFIG.MAX_WORKSPACES_PER_RUN)) {
      // Check time at start of each workspace
      if (!isTimeRemaining()) {
        break;
      }


      try {
        const systemUserId = 'cron-system';
        
        // Fetch all credentials in a single batch operation (more efficient)
        const credentialsMap = await withTimeout(
          CredentialService.getMultiplePlatformCredentials(
            ['instagram', 'facebook', 'youtube'],
            systemUserId,
            workspaceId,
            { useAdmin: true }
          ),
          CONFIG.API_TIMEOUT_MS,
          new Map()
        );

        const instagramCreds = credentialsMap.get('instagram');
        const facebookCreds = credentialsMap.get('facebook');
        let youtubeCreds = credentialsMap.get('youtube');
        
        // Only attempt refresh if token is clearly expired and we have time
        if (youtubeCreds?.refreshToken && youtubeCreds?.expiresAt && isTimeRemaining()) {
          const isExpired = new Date(youtubeCreds.expiresAt).getTime() < Date.now();
          if (isExpired) {
            try {
              const youtubeService = platformServiceFactory.createService('youtube');
              if (youtubeService) {
                const refreshed = await withTimeout(
                  youtubeService.refreshAccessToken(youtubeCreds.refreshToken),
                  CONFIG.API_TIMEOUT_MS,
                  null
                );
                if (refreshed) {
                  youtubeCreds = {
                    ...youtubeCreds,
                    accessToken: refreshed.accessToken,
                    expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
                  };
                }
              }
            } catch (refreshError) {
            }
          }
        }


        // IMPORTANT: Facebook's "new Pages experience" REQUIRES a Page Access Token
        // The Page token should inherit pages_read_engagement from the user's OAuth grant
        // If it doesn't work, the user may need to:
        // 1. Be an admin of the Facebook Page
        // 2. Reconnect their account after enabling permissions in App Review
        const pageAccessToken = facebookCreds?.accessToken;
        const userAccessToken = facebookCreds?.userAccessToken;
        
        // Skip only if NO platforms are connected
        if (!pageAccessToken && !youtubeCreds?.accessToken) {
          continue;
        }
        
        // Facebook Page ID (only required if Facebook is connected)
        const facebookPageId = facebookCreds?.pageId;

        if (pageAccessToken && !facebookPageId) {
        }

        // Fetch Instagram Business Account ID with timeout
        let instagramUserId: string | null = null;
        
        if (facebookPageId && pageAccessToken) {
          instagramUserId = await withTimeout(
            getInstagramBusinessAccountId(facebookPageId, pageAccessToken),
            CONFIG.API_TIMEOUT_MS,
            null
          );
        }
        
        // Fallback to stored Instagram credentials if dynamic fetch fails
        if (!instagramUserId && instagramCreds?.userId) {
          instagramUserId = instagramCreds.userId;
        }

        // Get YouTube channel ID with timeout (use stored if available)
        let youtubeChannelId: string | undefined = youtubeCreds?.channelId;
        
        if (!youtubeChannelId && youtubeCreds?.accessToken && isTimeRemaining()) {
          const channelData = await withTimeout(
            fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`, {
              headers: { 'Authorization': `Bearer ${youtubeCreds.accessToken}` }
            }).then(r => r.ok ? r.json() : null),
            CONFIG.API_TIMEOUT_MS,
            null
          );
          youtubeChannelId = channelData?.items?.[0]?.id;
        }

        // Check time before heavy processing
        if (!isTimeRemaining()) {
          break;
        }

        // Dynamically determine which platforms to process based on connected credentials
        const platformsToProcess: ('instagram' | 'facebook' | 'youtube')[] = [];
        
        if (pageAccessToken && facebookPageId) {
          platformsToProcess.push('facebook');
          if (instagramUserId) {
            platformsToProcess.push('instagram');
          }
        }
        
        if (youtubeCreds?.accessToken) {
          platformsToProcess.push('youtube');
        }


        if (platformsToProcess.length === 0) {
          continue;
        }

        const result = await processComments(
          {
            workspaceId,
            userId: systemUserId,
            platforms: platformsToProcess,
            runType: 'cron',
          },
          {
            // Meta platforms access token (Page Access Token for Facebook/Instagram)
            accessToken: pageAccessToken || '',
            instagramUserId: instagramUserId || undefined,
            facebookPageId: facebookPageId || undefined,
            // YouTube-specific access token (only if YouTube is connected)
            youtubeAccessToken: youtubeCreds?.accessToken || undefined,
            youtubeChannelId: youtubeChannelId || undefined,
          }
        );

        results.push({
          workspaceId,
          ...result,
        });

        totalAutoReplied += result.autoReplied;
        totalEscalated += result.escalated;
        totalErrors += result.errors;

      } catch (error) {
        totalErrors++;
        results.push({
          workspaceId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const executionTime = Date.now() - startTime;


    return NextResponse.json({
      success: true,
      workspaces: results.length,
      totalAutoReplied,
      totalEscalated,
      totalErrors,
      executionTime,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleProcessComments(request);
}

export async function POST(request: NextRequest) {
  return handleProcessComments(request);
}
