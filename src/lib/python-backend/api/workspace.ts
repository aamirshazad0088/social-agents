/**
 * Workspace API
 * 
 * API client for workspace management including CRUD operations,
 * team member management, invitations, and business settings.
 */

import { get, post, patch, del, put } from '../client';
import { ENDPOINTS } from '../config';
import type {
  Workspace,
  UpdateWorkspaceRequest,
  WorkspaceMember,
  WorkspaceInvite,
  CreateInviteRequest,
  AcceptInviteRequest,
  InviteDetails,
  ActivityLogEntry,
  ActivityOptions,
  BusinessSettings,
  WorkspaceInfo,
} from '../types';

// =============================================================================
// WORKSPACE CRUD
// =============================================================================

/**
 * Get current workspace
 * 
 * Retrieves the workspace associated with the authenticated user.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to workspace data
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  return get<Workspace>(ENDPOINTS.workspace.base, {
    params: { workspace_id: workspaceId },
  });
}

/**
 * Update workspace
 * 
 * Updates workspace settings like name and slug.
 * 
 * @param workspaceId - Workspace ID
 * @param updates - Fields to update
 * @returns Promise resolving to updated workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: UpdateWorkspaceRequest
): Promise<Workspace> {
  return patch<Workspace>(ENDPOINTS.workspace.base, updates, {
    params: { workspace_id: workspaceId },
  });
}

/**
 * Delete workspace
 * 
 * Permanently deletes a workspace and all associated data.
 * Requires admin role.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteWorkspace(
  workspaceId: string
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(ENDPOINTS.workspace.base, {
    params: { workspace_id: workspaceId },
  });
}

// =============================================================================
// MEMBERS
// =============================================================================

/**
 * Get workspace members
 * 
 * Retrieves all members of the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to list of members
 */
export async function getMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const result = await get<{ members: WorkspaceMember[] }>(
    ENDPOINTS.workspace.members,
    { params: { workspace_id: workspaceId } }
  );
  return result.members;
}

/**
 * Remove a member from workspace
 * 
 * Removes a team member from the workspace.
 * Requires admin role.
 * 
 * @param workspaceId - Workspace ID
 * @param memberId - Member ID to remove
 * @returns Promise resolving when removal is complete
 */
export async function removeMember(
  workspaceId: string,
  memberId: string
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(
    `${ENDPOINTS.workspace.members}/${memberId}`,
    { params: { workspace_id: workspaceId } }
  );
}

// =============================================================================
// INVITATIONS
// =============================================================================

/**
 * Get pending invitations
 * 
 * Retrieves all pending invitations for the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to list of invitations
 */
export async function getInvites(
  workspaceId: string
): Promise<WorkspaceInvite[]> {
  const result = await get<{ invites: WorkspaceInvite[] }>(
    ENDPOINTS.workspace.invites,
    { params: { workspace_id: workspaceId } }
  );
  return result.invites;
}

/**
 * Create a new invitation
 * 
 * Invites a user to join the workspace by email.
 * 
 * @param workspaceId - Workspace ID
 * @param invite - Invitation details
 * @returns Promise resolving to created invitation
 */
export async function createInvite(
  workspaceId: string,
  invite: CreateInviteRequest
): Promise<WorkspaceInvite> {
  return post<WorkspaceInvite>(ENDPOINTS.workspace.invites, invite, {
    params: { workspace_id: workspaceId },
  });
}

/**
 * Delete an invitation
 * 
 * Cancels a pending invitation.
 * 
 * @param workspaceId - Workspace ID
 * @param inviteId - Invitation ID to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteInvite(
  workspaceId: string,
  inviteId: string
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(ENDPOINTS.workspace.invites, {
    params: { workspace_id: workspaceId, invite_id: inviteId },
  });
}

/**
 * Accept an invitation
 * 
 * Accepts a workspace invitation using the provided token.
 * 
 * @param token - Invitation token
 * @returns Promise resolving when invitation is accepted
 */
export async function acceptInvite(
  token: string
): Promise<{ success: boolean; workspaceId: string }> {
  const request: AcceptInviteRequest = { token };
  return post<{ success: boolean; workspaceId: string }>(
    ENDPOINTS.workspace.acceptInvite,
    request
  );
}

/**
 * Get invitation details by token
 * 
 * Validates an invitation token and retrieves invitation details.
 * 
 * @param token - Invitation token
 * @returns Promise resolving to invitation details
 */
export async function getInviteDetails(token: string): Promise<InviteDetails> {
  return get<InviteDetails>(ENDPOINTS.workspace.inviteDetails(token));
}

// =============================================================================
// ACTIVITY
// =============================================================================

/**
 * Get workspace activity log
 * 
 * Retrieves recent activity in the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @param options - Optional filters and pagination
 * @returns Promise resolving to activity entries
 */
export async function getActivity(
  workspaceId: string,
  options?: ActivityOptions
): Promise<ActivityLogEntry[]> {
  const result = await get<{ activity: ActivityLogEntry[] }>(
    ENDPOINTS.workspace.activity,
    {
      params: {
        workspace_id: workspaceId,
        ...options,
      },
    }
  );
  return result.activity;
}

// =============================================================================
// BUSINESS SETTINGS
// =============================================================================

/**
 * Get business settings
 * 
 * Retrieves business profile and branding settings for the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to business settings
 */
export async function getBusinessSettings(
  workspaceId: string
): Promise<BusinessSettings> {
  return get<BusinessSettings>(ENDPOINTS.workspace.businessSettings, {
    params: { workspace_id: workspaceId },
  });
}

/**
 * Update business settings
 * 
 * Updates business profile, branding, and other settings.
 * 
 * @param workspaceId - Workspace ID
 * @param settings - Settings to update
 * @returns Promise resolving to updated settings
 */
export async function updateBusinessSettings(
  workspaceId: string,
  settings: Partial<BusinessSettings>
): Promise<BusinessSettings> {
  return put<BusinessSettings>(ENDPOINTS.workspace.businessSettings, settings, {
    params: { workspace_id: workspaceId },
  });
}

/**
 * Delete business settings
 * 
 * Removes all business settings for the workspace.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteBusinessSettings(
  workspaceId: string
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(ENDPOINTS.workspace.businessSettings, {
    params: { workspace_id: workspaceId },
  });
}

// =============================================================================
// WORKSPACE INFO
// =============================================================================

/**
 * Get complete workspace info
 * 
 * Retrieves comprehensive workspace information including
 * settings, members, and business settings.
 * 
 * @param workspaceId - Workspace ID
 * @returns Promise resolving to workspace info
 */
export async function getWorkspaceInfo(
  workspaceId: string
): Promise<WorkspaceInfo> {
  return get<WorkspaceInfo>(ENDPOINTS.workspace.info, {
    params: { workspace_id: workspaceId },
  });
}
