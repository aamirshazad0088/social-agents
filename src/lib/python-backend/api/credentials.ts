/**
 * Credentials API
 * 
 * API client for managing social platform credentials and connection status.
 */

import { get, del } from '../client';
import { ENDPOINTS } from '../config';
import type {
    Platform,
    ConnectionStatusMap,
    PlatformCredential,
    DisconnectResponse,
} from '../types';

/**
 * Get connection status for all platforms
 * 
 * Retrieves the connection status for all supported social platforms.
 * 
 * @param userId - User ID for authentication
 * @returns Promise resolving to connection status map
 */
export async function getConnectionStatus(
    userId: string
): Promise<ConnectionStatusMap> {
    return get<ConnectionStatusMap>(ENDPOINTS.credentials.status, {
        params: { user_id: userId },
    });
}

/**
 * Get credential details for a specific platform
 * 
 * Retrieves detailed credential information for a connected platform.
 * 
 * @param userId - User ID for authentication
 * @param platform - Platform to get credentials for
 * @returns Promise resolving to platform credential details
 */
export async function getPlatformCredential(
    userId: string,
    platform: Platform
): Promise<PlatformCredential> {
    return get<PlatformCredential>(ENDPOINTS.credentials.platform(platform), {
        params: { user_id: userId },
    });
}

/**
 * Disconnect a platform
 * 
 * Removes the connection to a social platform.
 * Requires admin role in the workspace.
 * 
 * @param userId - User ID for authentication
 * @param platform - Platform to disconnect
 * @returns Promise resolving to disconnect response
 */
export async function disconnectPlatform(
    userId: string,
    platform: Platform
): Promise<DisconnectResponse> {
    return del<DisconnectResponse>(ENDPOINTS.credentials.disconnect(platform), {
        params: { user_id: userId },
    });
}

/**
 * Get credentials API info
 * 
 * Retrieves information about the credentials service.
 * 
 * @returns Promise resolving to service info
 */
export async function getCredentialsInfo(): Promise<{
    service: string;
    version: string;
    endpoints: Record<string, Record<string, string>>;
    supported_platforms: string[];
}> {
    return get(ENDPOINTS.credentials.base);
}

/**
 * Check if a platform is connected
 * 
 * Convenience function to check if a specific platform is connected.
 * 
 * @param userId - User ID for authentication
 * @param platform - Platform to check
 * @returns Promise resolving to boolean indicating connection status
 */
export async function isPlatformConnected(
    userId: string,
    platform: Platform
): Promise<boolean> {
    const credential = await getPlatformCredential(userId, platform);
    return credential.connected;
}

/**
 * Get all connected platforms
 * 
 * Returns a list of all currently connected platform names.
 * 
 * @param userId - User ID for authentication
 * @returns Promise resolving to array of connected platform names
 */
export async function getConnectedPlatforms(
    userId: string
): Promise<Platform[]> {
    const status = await getConnectionStatus(userId);
    const platforms: Platform[] = [];

    for (const [platform, info] of Object.entries(status)) {
        if (info.connected) {
            platforms.push(platform as Platform);
        }
    }

    return platforms;
}
