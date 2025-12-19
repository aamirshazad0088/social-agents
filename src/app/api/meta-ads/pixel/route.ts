/**
 * Facebook Pixel Integration Endpoint
 * GET /api/meta-ads/pixel - Get pixel information
 * POST /api/meta-ads/pixel/events - Track conversion events
 * 
 * Facebook Pixel allows you to track conversions and optimize ads based on
 * user actions on your website.
 * 
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceService } from '@/services/database/workspaceService';
import { getMetaAdsCredentials } from '@/lib/meta/getCredentials';

const META_API_VERSION = 'v24.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * GET /api/meta-ads/pixel
 * Get pixel information for the ad account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          message: 'Please connect your Meta Ads account to view pixels.'
        },
        { status: 401 }
      );
    }

    const accountId = creds.account_id;
    const accessToken = creds.access_token;

    // Get pixels associated with ad account
    const pixelsResponse = await fetch(
      `${META_API_BASE}/act_${accountId}/adspixels?fields=id,name,is_created_by_business,creation_time&access_token=${accessToken}`
    );

    if (!pixelsResponse.ok) {
      throw new Error('Failed to fetch pixels from Meta API');
    }

    const pixelsData = await pixelsResponse.json();

    return NextResponse.json({
      pixels: pixelsData.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pixels' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta-ads/pixel/events
 * Track conversion events via Conversions API
 * 
 * Body: {
 *   pixel_id: string,
 *   events: Array<{
 *     event_name: string,
 *     event_time: number (Unix timestamp),
 *     event_id?: string,
 *     user_data: {
 *       em?: string (hashed email),
 *       ph?: string (hashed phone),
 *       fn?: string (hashed first name),
 *       ln?: string (hashed last name),
 *       external_id?: string,
 *       client_ip_address?: string,
 *       client_user_agent?: string,
 *       fbc?: string (Facebook click ID),
 *       fbp?: string (Facebook browser ID),
 *     },
 *     custom_data?: {
 *       value?: number,
 *       currency?: string,
 *       content_name?: string,
 *       content_category?: string,
 *       content_ids?: string[],
 *       contents?: Array<{ id: string; quantity: number; item_price?: number }>,
 *       num_items?: number,
 *       order_id?: string,
 *     },
 *     action_source?: 'website' | 'app' | 'phone_call' | 'email' | 'chat' | 'physical_store' | 'system_generated' | 'other',
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
    const { pixel_id, events, access_token: providedToken } = body;

    if (!pixel_id || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'pixel_id and events array are required' },
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
    const accessToken = providedToken || creds?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Meta Ads not connected',
          message: 'Please connect your Meta Ads account or provide an access token to track events.'
        },
        { status: 401 }
      );
    }

    // Prepare events for Conversions API
    const formattedEvents = events.map((event: any) => ({
      event_name: event.event_name,
      event_time: event.event_time || Math.floor(Date.now() / 1000),
      event_id: event.event_id,
      event_source_url: event.event_source_url,
      action_source: event.action_source || 'website',
      user_data: {
        ...event.user_data,
        // Hash email and phone if provided (should be hashed client-side)
        em: event.user_data?.em,
        ph: event.user_data?.ph,
        fn: event.user_data?.fn,
        ln: event.user_data?.ln,
        external_id: event.user_data?.external_id,
        client_ip_address: event.user_data?.client_ip_address,
        client_user_agent: event.user_data?.client_user_agent,
        fbc: event.user_data?.fbc,
        fbp: event.user_data?.fbp,
      },
      custom_data: event.custom_data || {},
    }));

    // Send events to Conversions API
    const conversionsResponse = await fetch(
      `${META_API_BASE}/${pixel_id}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: formattedEvents,
          access_token: accessToken,
          test_event_code: body.test_event_code, // Optional: for testing
        }),
      }
    );

    if (!conversionsResponse.ok) {
      const error = await conversionsResponse.json();
      throw new Error(error.error?.message || 'Failed to track events');
    }

    const result = await conversionsResponse.json();

    return NextResponse.json({
      events_received: result.events_received || events.length,
      messages: result.messages || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to track events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Common conversion event types
 */
export const PIXEL_EVENT_TYPES = {
  // Standard Events
  PAGE_VIEW: 'PageView',
  VIEW_CONTENT: 'ViewContent',
  SEARCH: 'Search',
  ADD_TO_CART: 'AddToCart',
  ADD_TO_WISHLIST: 'AddToWishlist',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  FIND_LOCATION: 'FindLocation',
  SCHEDULE: 'Schedule',
  CONTACT: 'Contact',
  SUBSCRIBE: 'Subscribe',
  START_TRIAL: 'StartTrial',
  
  // Custom Events
  CUSTOM: 'Custom', // Use for custom event names
} as const;

