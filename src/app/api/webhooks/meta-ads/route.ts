/**
 * Meta Ads Webhooks Handler
 * POST /api/webhooks/meta-ads - Handle real-time updates from Meta Marketing API
 * 
 * Webhooks provide real-time notifications for:
 * - Campaign status changes
 * - Ad set status changes
 * - Ad status changes
 * - Budget alerts
 * - Delivery issues
 * 
 * @see https://developers.facebook.com/docs/marketing-api/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const META_APP_SECRET = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

/**
 * Verify webhook signature from Meta
 */
function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!META_APP_SECRET) {
    return true; // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * GET /api/webhooks/meta-ads
 * Webhook verification (required by Meta)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify token matches expected value
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'meta_ads_webhook_token';

  if (mode === 'subscribe' && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhooks/meta-ads
 * Handle webhook events from Meta
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';

    // Verify webhook signature
    if (signature && !verifyWebhookSignature(rawBody, signature.replace('sha256=', ''))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Handle different webhook event types
    if (body.object === 'ad_account') {
      // Ad account events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await handleAdAccountChange(entry.id, change);
        }
      }
    } else if (body.object === 'campaign') {
      // Campaign events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await handleCampaignChange(entry.id, change);
        }
      }
    } else if (body.object === 'adset') {
      // Ad set events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await handleAdSetChange(entry.id, change);
        }
      }
    } else if (body.object === 'ad') {
      // Ad events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          await handleAdChange(entry.id, change);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true });
  } catch (error) {
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: false, error: 'Processing failed' });
  }
}

/**
 * Handle ad account changes
 */
async function handleAdAccountChange(accountId: string, change: any) {

  const { field, value } = change;

  if (field === 'spend_cap') {
    // Budget cap reached
    await logWebhookEvent({
      type: 'ad_account_spend_cap',
      account_id: accountId,
      field,
      value,
      message: `Ad account ${accountId} reached spend cap`,
    });
  } else if (field === 'account_status') {
    // Account status changed
    await logWebhookEvent({
      type: 'ad_account_status',
      account_id: accountId,
      field,
      value,
      message: `Ad account ${accountId} status changed to ${value}`,
    });
  }
}

/**
 * Handle campaign changes
 */
async function handleCampaignChange(campaignId: string, change: any) {

  const { field, value } = change;

  if (field === 'status') {
    // Campaign status changed
    await logWebhookEvent({
      type: 'campaign_status',
      campaign_id: campaignId,
      field,
      value,
      message: `Campaign ${campaignId} status changed to ${value}`,
    });

    // Notify users if campaign was paused/archived
    if (value === 'PAUSED' || value === 'ARCHIVED') {
      await notifyCampaignStatusChange(campaignId, value);
    }
  } else if (field === 'daily_budget' || field === 'lifetime_budget') {
    // Budget changed
    await logWebhookEvent({
      type: 'campaign_budget',
      campaign_id: campaignId,
      field,
      value,
      message: `Campaign ${campaignId} budget changed`,
    });
  } else if (field === 'effective_status') {
    // Effective status changed (e.g., due to ad set issues)
    await logWebhookEvent({
      type: 'campaign_effective_status',
      campaign_id: campaignId,
      field,
      value,
      message: `Campaign ${campaignId} effective status changed to ${value}`,
    });
  }
}

/**
 * Handle ad set changes
 */
async function handleAdSetChange(adSetId: string, change: any) {

  const { field, value } = change;

  if (field === 'status') {
    await logWebhookEvent({
      type: 'adset_status',
      adset_id: adSetId,
      field,
      value,
      message: `Ad Set ${adSetId} status changed to ${value}`,
    });
  } else if (field === 'daily_budget' || field === 'lifetime_budget') {
    await logWebhookEvent({
      type: 'adset_budget',
      adset_id: adSetId,
      field,
      value,
      message: `Ad Set ${adSetId} budget changed`,
    });
  } else if (field === 'delivery_status') {
    // Delivery issues
    await logWebhookEvent({
      type: 'adset_delivery_status',
      adset_id: adSetId,
      field,
      value,
      message: `Ad Set ${adSetId} delivery status: ${value}`,
    });
  }
}

/**
 * Handle ad changes
 */
async function handleAdChange(adId: string, change: any) {

  const { field, value } = change;

  if (field === 'status') {
    await logWebhookEvent({
      type: 'ad_status',
      ad_id: adId,
      field,
      value,
      message: `Ad ${adId} status changed to ${value}`,
    });

    // Notify if ad was disapproved
    if (value === 'DISAPPROVED') {
      await notifyAdDisapproval(adId);
    }
  } else if (field === 'effective_status') {
    await logWebhookEvent({
      type: 'ad_effective_status',
      ad_id: adId,
      field,
      value,
      message: `Ad ${adId} effective status changed to ${value}`,
    });
  }
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(event: {
  type: string;
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  field: string;
  value: any;
  message: string;
}) {
  try {
    const supabase = await createServerClient();

    // Store webhook events (you may want to create a webhook_events table)
    // For now, we'll just log to console

    // TODO: Store in database table if needed
    // await supabase.from('webhook_events').insert({
    //   type: event.type,
    //   account_id: event.account_id,
    //   campaign_id: event.campaign_id,
    //   adset_id: event.adset_id,
    //   ad_id: event.ad_id,
    //   field: event.field,
    //   value: JSON.stringify(event.value),
    //   message: event.message,
    //   created_at: new Date().toISOString(),
    // });
  } catch (error) {
  }
}

/**
 * Notify users of campaign status changes
 */
async function notifyCampaignStatusChange(campaignId: string, status: string) {
  // TODO: Implement notification system
  // - Send email notification
  // - In-app notification
  // - Slack/Discord webhook
}

/**
 * Notify users of ad disapproval
 */
async function notifyAdDisapproval(adId: string) {
  // TODO: Implement notification system
}

