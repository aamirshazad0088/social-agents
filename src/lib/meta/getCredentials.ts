/**
 * Meta Ads Credentials Helper
 * Retrieves, decrypts, and validates Meta Ads credentials
 * 
 * UNIFIED APPROACH:
 * - Uses existing Facebook/Instagram OAuth credentials for Ads
 * - Automatically fetches Ad Account ID if not present
 * - Falls back through: meta_ads > facebook > instagram
 */

import { MetaCredentialService } from '@/services/meta/MetaCredentialService'

export interface MetaAdsCredentials {
  access_token: string;
  account_id?: string;
  account_name?: string;
  expires_at?: string;
  page_id?: string;
  page_name?: string;
  is_expired?: boolean;
  expires_soon?: boolean;
}

// Token is considered expiring soon if less than 7 days remain
const TOKEN_EXPIRY_WARNING_DAYS = 7;

/**
 * Get Meta Ads credentials from database
 * Uses unified MetaCredentialService to check all Meta platforms
 * 
 * Priority: meta_ads > facebook > instagram
 * Automatically fetches Ad Account ID from Facebook API if not stored
 */
export async function getMetaAdsCredentials(
  workspaceId: string,
  userId: string
): Promise<MetaAdsCredentials | null> {
  try {
    // Use unified service to get credentials from any Meta platform
    const credentials = await MetaCredentialService.getAdsCredentials(workspaceId, userId)
    
    if (!credentials) {
      return null
    }

    return credentials
  } catch (error) {
    return null
  }
}

/**
 * Check if credentials need refresh
 */
export function needsTokenRefresh(credentials: MetaAdsCredentials): boolean {
  return credentials.is_expired === true || credentials.expires_soon === true;
}

/**
 * Check if workspace can run Meta Ads
 * Returns detailed capability info
 */
export async function checkMetaAdsCapability(
  workspaceId: string,
  userId?: string
) {
  return MetaCredentialService.checkAdsCapability(workspaceId, userId)
}

/**
 * Get connection status for all Meta platforms
 */
export async function getMetaConnectionStatus(workspaceId: string) {
  return MetaCredentialService.getConnectionStatus(workspaceId)
}

/**
 * Refresh Meta token
 */
export async function refreshMetaToken(workspaceId: string, userId: string) {
  return MetaCredentialService.refreshToken(workspaceId, userId)
}
