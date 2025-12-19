/**
 * Permission System - Production Ready
 * Centralized permission checking and role-based access control
 */

import type { UserRole } from '@/types/workspace'
import { ROLE_PERMISSIONS } from '@/types/workspace'

/**
 * Permission types - all possible permissions in the system
 */
export type Permission =
  | 'manage_members'
  | 'change_roles'
  | 'update_workspace'
  | 'view_workspace'
  | 'delete_members'
  | 'delete_posts'
  | 'delete_media'
  | 'manage_credentials'
  | 'create_posts'
  | 'edit_posts'
  | 'upload_media'
  | 'view_posts'
  | 'view_media'

/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
}

/**
 * Check if a role has a specific permission
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns True if role has the permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 * @param role - User role to check
 * @param permissions - Array of permissions to check
 * @returns True if role has at least one permission
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 * @param role - User role to check
 * @param permissions - Array of permissions to check
 * @returns True if role has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

/**
 * Check if a role can perform an action on a resource
 * @param role - User role to check
 * @param action - Action to perform (create, read, update, delete)
 * @param resource - Resource type
 * @returns True if role can perform the action
 */
export function canPerformAction(
  role: UserRole,
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'posts' | 'media' | 'members' | 'workspace'
): boolean {
  // Map actions to permissions
  const permissionMap: Record<string, Permission> = {
    'create_posts': 'create_posts',
    'read_posts': 'view_posts',
    'update_posts': 'edit_posts',
    'delete_posts': 'delete_posts',
    'create_media': 'upload_media',
    'read_media': 'view_media',
    'update_media': 'upload_media',
    'delete_media': 'delete_media',
    'create_members': 'manage_members',
    'read_members': 'view_posts', // All roles can view members
    'update_members': 'manage_members',
    'delete_members': 'delete_members',
    'update_workspace': 'update_workspace',
  }

  const permissionKey = `${action}_${resource}`
  const permission = permissionMap[permissionKey]

  if (!permission) {
    return false
  }

  return hasPermission(role, permission)
}

/**
 * Check if role A has higher or equal hierarchy than role B
 * @param roleA - First role
 * @param roleB - Second role
 * @returns True if roleA >= roleB in hierarchy
 */
export function isRoleHigherOrEqual(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB]
}

/**
 * Check if a user can change another user's role
 * Rules:
 * - Only admins can change roles
 * - Cannot change your own role
 * - Cannot demote the last admin
 * @param currentUserRole - Role of user making the change
 * @param targetUserRole - Current role of user being changed
 * @param newRole - New role to assign
 * @param isLastAdmin - Whether target user is the last admin
 * @param isSelf - Whether changing own role
 * @returns Object with canChange boolean and reason if false
 */
export function canChangeRole(
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  newRole: UserRole,
  isLastAdmin: boolean,
  isSelf: boolean
): { canChange: boolean; reason?: string } {
  // Only admins can change roles
  if (currentUserRole !== 'admin') {
    return { canChange: false, reason: 'Only admins can change roles' }
  }

  // Cannot change your own role
  if (isSelf) {
    return { canChange: false, reason: 'Cannot change your own role' }
  }

  // Cannot demote the last admin
  if (isLastAdmin && targetUserRole === 'admin' && newRole !== 'admin') {
    return { canChange: false, reason: 'Cannot demote the last admin' }
  }

  return { canChange: true }
}

/**
 * Check if a user can remove another user
 * Rules:
 * - Only admins can remove members
 * - Cannot remove yourself
 * - Cannot remove the last admin
 * @param currentUserRole - Role of user performing removal
 * @param targetUserRole - Role of user being removed
 * @param isLastAdmin - Whether target is the last admin
 * @param isSelf - Whether removing self
 * @returns Object with canRemove boolean and reason if false
 */
export function canRemoveMember(
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  isLastAdmin: boolean,
  isSelf: boolean
): { canRemove: boolean; reason?: string } {
  // Only admins can remove members
  if (currentUserRole !== 'admin') {
    return { canRemove: false, reason: 'Only admins can remove members' }
  }

  // Cannot remove yourself
  if (isSelf) {
    return { canRemove: false, reason: 'Cannot remove yourself' }
  }

  // Cannot remove the last admin
  if (isLastAdmin && targetUserRole === 'admin') {
    return { canRemove: false, reason: 'Cannot remove the last admin' }
  }

  return { canRemove: true }
}

/**
 * Validate role value
 * @param role - Role to validate
 * @returns True if role is valid
 */
export function isValidRole(role: string): role is UserRole {
  return ['admin', 'editor', 'viewer'].includes(role)
}

/**
 * Get all permissions for a role
 * @param role - User role
 * @returns Array of permissions
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Get role display name
 * @param role - User role
 * @returns Formatted role name
 */
export function getRoleDisplayName(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

/**
 * Get role description
 * @param role - User role
 * @returns Role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full control over workspace, members, and all content',
    editor: 'Can create and manage content and social accounts',
    viewer: 'Read-only access to workspace content',
  }
  return descriptions[role]
}

/**
 * Permission error messages
 */
export const PERMISSION_ERRORS = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  ADMIN_REQUIRED: 'Admin role required for this action',
  EDITOR_REQUIRED: 'Editor or Admin role required for this action',
  INVALID_ROLE: 'Invalid role specified',
  CANNOT_CHANGE_OWN_ROLE: 'Cannot change your own role',
  CANNOT_REMOVE_SELF: 'Cannot remove yourself from workspace',
  CANNOT_REMOVE_LAST_ADMIN: 'Cannot remove the last admin from workspace',
  CANNOT_DEMOTE_LAST_ADMIN: 'Cannot demote the last admin',
} as const
