/**
 * Canva Integration API
 * 
 * API client for Canva design integration including OAuth,
 * design browsing, and export functionality.
 */

import { get, post, del } from '../client';
import { ENDPOINTS } from '../config';
import type {
    CanvaDesign,
    CanvaExportRequest,
    CanvaExportResponse,
    CanvaAuthResponse,
} from '../types';

/**
 * Get Canva OAuth authorization URL
 * 
 * Initiates the Canva OAuth flow by returning the authorization URL.
 * 
 * @param workspaceId - Workspace ID to associate with the connection
 * @returns Promise resolving to auth URL
 */
export async function getAuthUrl(
    workspaceId: string
): Promise<CanvaAuthResponse> {
    return get<CanvaAuthResponse>(ENDPOINTS.canva.auth, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Get Canva designs
 * 
 * Retrieves a list of designs from the connected Canva account.
 * 
 * @param workspaceId - Workspace ID
 * @param limit - Maximum number of designs to retrieve (default: 50)
 * @param continuation - Pagination token for next page
 * @returns Promise resolving to array of Canva designs
 */
export async function getDesigns(
    workspaceId: string,
    limit: number = 50,
    continuation?: string
): Promise<{
    designs: CanvaDesign[];
    continuation?: string;
}> {
    return get(ENDPOINTS.canva.designs, {
        params: {
            workspace_id: workspaceId,
            limit,
            ...(continuation ? { continuation } : {}),
        },
    });
}

/**
 * Export a Canva design
 * 
 * Exports a design in the specified format and returns the download URL.
 * 
 * @param workspaceId - Workspace ID
 * @param request - Export request with design ID and format
 * @returns Promise resolving to export response with URL
 */
export async function exportDesign(
    workspaceId: string,
    request: CanvaExportRequest
): Promise<CanvaExportResponse> {
    return post<CanvaExportResponse>(ENDPOINTS.canva.export, request, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Check export status
 * 
 * Polls the status of an ongoing export job.
 * 
 * @param workspaceId - Workspace ID
 * @param jobId - Export job ID
 * @returns Promise resolving to export status
 */
export async function getExportStatus(
    workspaceId: string,
    jobId: string
): Promise<CanvaExportResponse> {
    return get<CanvaExportResponse>(`${ENDPOINTS.canva.export}/${jobId}`, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Disconnect Canva account
 * 
 * Removes the Canva connection from the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving when disconnection is complete
 */
export async function disconnect(
    workspaceId: string
): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(ENDPOINTS.canva.disconnect, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Check if Canva is connected
 * 
 * Verifies whether a Canva account is connected to the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to connection status
 */
export async function isConnected(
    workspaceId: string
): Promise<{
    connected: boolean;
    accountName?: string;
    expiresAt?: string;
}> {
    return get(`${ENDPOINTS.canva.auth}/status`, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Get single design details
 * 
 * Retrieves detailed information about a specific design.
 * 
 * @param workspaceId - Workspace ID
 * @param designId - Canva design ID
 * @returns Promise resolving to design details
 */
export async function getDesign(
    workspaceId: string,
    designId: string
): Promise<CanvaDesign> {
    return get<CanvaDesign>(`${ENDPOINTS.canva.designs}/${designId}`, {
        params: { workspace_id: workspaceId },
    });
}

/**
 * Export design and wait for completion
 * 
 * Convenience function that initiates export and polls until complete.
 * 
 * @param workspaceId - Workspace ID
 * @param request - Export request
 * @param maxAttempts - Maximum polling attempts (default: 30)
 * @param intervalMs - Polling interval in milliseconds (default: 2000)
 * @returns Promise resolving to final export response with URL
 */
export async function exportDesignAndWait(
    workspaceId: string,
    request: CanvaExportRequest,
    maxAttempts: number = 30,
    intervalMs: number = 2000
): Promise<CanvaExportResponse> {
    const initialResponse = await exportDesign(workspaceId, request);

    if (initialResponse.url) {
        return initialResponse;
    }

    if (!initialResponse.jobId) {
        throw new Error('Export failed: No job ID returned');
    }

    let attempts = 0;
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        const status = await getExportStatus(workspaceId, initialResponse.jobId);

        if (status.url) {
            return status;
        }

        if (status.status === 'failed') {
            throw new Error(status.error || 'Export failed');
        }

        attempts++;
    }

    throw new Error('Export timed out');
}
