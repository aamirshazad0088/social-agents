/**
 * Webhooks API
 * 
 * API client for webhook management and verification.
 */

import { get, post } from '../client';
import { ENDPOINTS } from '../config';
import type {
    WebhookInfo,
    MetaAdsVerificationParams,
} from '../types';

/**
 * Get webhook service info
 * 
 * Retrieves information about the webhooks service.
 * 
 * @returns Promise resolving to service info
 */
export async function getWebhooksInfo(): Promise<{
    service: string;
    version: string;
    endpoints: Record<string, Record<string, string>>;
}> {
    return get(ENDPOINTS.webhooks.base);
}

/**
 * Verify Meta Ads webhook
 * 
 * Handles the webhook verification challenge from Meta.
 * Used during webhook setup in Meta's developer portal.
 * 
 * @param params - Verification parameters from Meta
 * @returns Promise resolving to challenge response
 */
export async function verifyMetaAdsWebhook(
    params: MetaAdsVerificationParams
): Promise<string> {
    return get<string>(ENDPOINTS.webhooks.metaAds, {
        params: {
            'hub.mode': params['hub.mode'],
            'hub.verify_token': params['hub.verify_token'],
            'hub.challenge': params['hub.challenge'],
        },
    });
}

/**
 * Handle Meta Ads webhook event
 * 
 * Processes incoming webhook events from Meta Ads.
 * 
 * @param payload - Webhook event payload from Meta
 * @returns Promise resolving when event is processed
 */
export async function handleMetaAdsWebhook(
    payload: Record<string, unknown>
): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(
        ENDPOINTS.webhooks.metaAds,
        payload
    );
}
