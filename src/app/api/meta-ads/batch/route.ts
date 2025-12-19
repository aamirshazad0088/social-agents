/**
 * Meta Ads Batch Operations Endpoint
 * POST /api/meta-ads/batch - Bulk create/update campaigns, ad sets, and ads
 * 
 * Supports Meta Marketing API batch requests for efficient bulk operations
 * @see https://developers.facebook.com/docs/graph-api/batch-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface BatchRequest {
  method: 'POST' | 'PATCH' | 'DELETE';
  relative_url: string;
  body?: string;
  name?: string;
  depends_on?: string;
  omit_response_on_success?: boolean;
}

interface BatchResponse {
  code: number;
  headers: Array<{ name: string; value: string }>;
  body: string;
}

/**
 * POST /api/meta-ads/batch
 * 
 * Body: {
 *   requests: Array<{
 *     type: 'campaign' | 'adset' | 'ad',
 *     operation: 'create' | 'update' | 'delete',
 *     data: object,
 *     id?: string (required for update/delete)
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requests } = body;

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: requests array is required' },
        { status: 400 }
      );
    }

    // Limit batch size (Meta API allows up to 50 requests per batch)
    if (requests.length > 50) {
      return NextResponse.json(
        { error: 'Batch size exceeds limit of 50 requests' },
        { status: 400 }
      );
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
          message: 'Please connect your Meta Ads account to perform batch operations.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    // Build batch requests for Meta API
    const batchRequests: BatchRequest[] = requests.map((req: any, index: number) => {
      const { type, operation, data, id } = req;
      
      let relativeUrl = '';
      let method: 'POST' | 'PATCH' | 'DELETE' = 'POST';
      let requestBody: any = { access_token: accessToken };

      if (type === 'campaign') {
        if (operation === 'create') {
          relativeUrl = `act_${accountId}/campaigns`;
          method = 'POST';
          requestBody = {
            name: data.name,
            objective: data.objective,
            status: data.status || 'PAUSED',
            special_ad_categories: data.special_ad_categories || [],
            daily_budget: data.budget_type === 'daily' ? data.budget_amount * 100 : undefined,
            lifetime_budget: data.budget_type === 'lifetime' ? data.budget_amount * 100 : undefined,
            access_token: accessToken,
          };
        } else if (operation === 'update' && id) {
          relativeUrl = `${id}`;
          method = 'PATCH';
          requestBody = {
            name: data.name,
            status: data.status,
            daily_budget: data.budget_type === 'daily' ? data.budget_amount * 100 : undefined,
            lifetime_budget: data.budget_type === 'lifetime' ? data.budget_amount * 100 : undefined,
            access_token: accessToken,
          };
        } else if (operation === 'delete' && id) {
          relativeUrl = `${id}`;
          method = 'DELETE';
          requestBody = { access_token: accessToken };
        }
      } else if (type === 'adset') {
        if (operation === 'create') {
          relativeUrl = `act_${accountId}/adsets`;
          method = 'POST';
          requestBody = {
            campaign_id: data.campaign_id,
            name: data.name,
            optimization_goal: data.optimization_goal,
            billing_event: data.billing_event,
            status: data.status || 'PAUSED',
            daily_budget: data.budget_type === 'daily' ? data.budget_amount * 100 : undefined,
            lifetime_budget: data.budget_type === 'lifetime' ? data.budget_amount * 100 : undefined,
            targeting: JSON.stringify(data.targeting || {}),
            access_token: accessToken,
          };
        } else if (operation === 'update' && id) {
          relativeUrl = `${id}`;
          method = 'PATCH';
          requestBody = {
            name: data.name,
            status: data.status,
            daily_budget: data.budget_type === 'daily' ? data.budget_amount * 100 : undefined,
            lifetime_budget: data.budget_type === 'lifetime' ? data.budget_amount * 100 : undefined,
            access_token: accessToken,
          };
        } else if (operation === 'delete' && id) {
          relativeUrl = `${id}`;
          method = 'DELETE';
          requestBody = { access_token: accessToken };
        }
      } else if (type === 'ad') {
        if (operation === 'create') {
          relativeUrl = `act_${accountId}/ads`;
          method = 'POST';
          requestBody = {
            adset_id: data.adset_id,
            name: data.name,
            status: data.status || 'PAUSED',
            creative: JSON.stringify(data.creative || {}),
            access_token: accessToken,
          };
        } else if (operation === 'update' && id) {
          relativeUrl = `${id}`;
          method = 'PATCH';
          requestBody = {
            name: data.name,
            status: data.status,
            access_token: accessToken,
          };
        } else if (operation === 'delete' && id) {
          relativeUrl = `${id}`;
          method = 'DELETE';
          requestBody = { access_token: accessToken };
        }
      }

      // Convert body to URL-encoded string for batch requests
      const bodyString = new URLSearchParams(
        Object.entries(requestBody).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      return {
        method,
        relative_url: relativeUrl,
        body: bodyString,
        name: `request_${index}`,
      };
    }).filter((req: BatchRequest | null) => req !== null) as BatchRequest[];

    if (batchRequests.length === 0) {
      return NextResponse.json(
        { error: 'No valid batch requests to process' },
        { status: 400 }
      );
    }

    // Execute batch request to Meta API
    const batchResponse = await fetch(`${META_API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        batch: batchRequests,
      }),
    });

    if (!batchResponse.ok) {
      const error = await batchResponse.json();
      throw new Error(error.error?.message || 'Failed to execute batch request');
    }

    const batchResults: BatchResponse[] = await batchResponse.json();

    // Process results
    const results = batchResults.map((result, index) => {
      try {
        const parsedBody = JSON.parse(result.body);
        
        if (result.code >= 200 && result.code < 300) {
          return {
            success: true,
            index,
            id: parsedBody.id || parsedBody.campaign_id || parsedBody.adset_id || parsedBody.ad_id,
            data: parsedBody,
          };
        } else {
          return {
            success: false,
            index,
            error: parsedBody.error || 'Unknown error',
            code: result.code,
          };
        }
      } catch (parseError) {
        return {
          success: false,
          index,
          error: 'Failed to parse response',
          code: result.code,
        };
      }
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute batch operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

