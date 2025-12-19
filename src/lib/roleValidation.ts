/**
 * Role Validation and Security Utilities
 * Production-ready validation for role operations
 */

import type { UserRole } from '@/types/workspace'
import { isValidRole, canChangeRole, canRemoveMember, PERMISSION_ERRORS } from './permissions'

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  code?: string
}

/**
 * Role change validation input
 */
export interface RoleChangeInput {
  currentUserRole: UserRole
  currentUserId: string
  targetUserId: string
  targetCurrentRole: UserRole
  newRole: string
  adminCount: number
}

/**
 * Member removal validation input
 */
export interface MemberRemovalInput {
  currentUserRole: UserRole
  currentUserId: string
  targetUserId: string
  targetRole: UserRole
  adminCount: number
}

/**
 * Validate role change operation
 * Comprehensive validation for changing a user's role
 * @param input - Role change validation parameters
 * @returns Validation result with error details if invalid
 */
export function validateRoleChange(input: RoleChangeInput): ValidationResult {
  const {
    currentUserRole,
    currentUserId,
    targetUserId,
    targetCurrentRole,
    newRole,
    adminCount,
  } = input

  // Validate new role format
  if (!isValidRole(newRole)) {
    return {
      valid: false,
      error: PERMISSION_ERRORS.INVALID_ROLE,
      code: 'INVALID_ROLE',
    }
  }

  // Check if role is actually changing
  if (targetCurrentRole === newRole) {
    return {
      valid: false,
      error: 'User already has this role',
      code: 'NO_CHANGE',
    }
  }

  // Check if user is trying to change their own role
  const isSelf = currentUserId === targetUserId

  // Check if target is the last admin
  const isLastAdmin = adminCount === 1 && targetCurrentRole === 'admin'

  // Validate permission to change role
  const { canChange, reason } = canChangeRole(
    currentUserRole,
    targetCurrentRole,
    newRole as UserRole,
    isLastAdmin,
    isSelf
  )

  if (!canChange) {
    return {
      valid: false,
      error: reason || PERMISSION_ERRORS.UNAUTHORIZED,
      code: isSelf
        ? 'CANNOT_CHANGE_OWN_ROLE'
        : isLastAdmin
        ? 'CANNOT_DEMOTE_LAST_ADMIN'
        : 'UNAUTHORIZED',
    }
  }

  return { valid: true }
}

/**
 * Validate member removal operation
 * Comprehensive validation for removing a workspace member
 * @param input - Member removal validation parameters
 * @returns Validation result with error details if invalid
 */
export function validateMemberRemoval(input: MemberRemovalInput): ValidationResult {
  const { currentUserRole, currentUserId, targetUserId, targetRole, adminCount } = input

  // Check if user is trying to remove themselves
  const isSelf = currentUserId === targetUserId

  // Check if target is the last admin
  const isLastAdmin = adminCount === 1 && targetRole === 'admin'

  // Validate permission to remove member
  const { canRemove, reason } = canRemoveMember(
    currentUserRole,
    targetRole,
    isLastAdmin,
    isSelf
  )

  if (!canRemove) {
    return {
      valid: false,
      error: reason || PERMISSION_ERRORS.UNAUTHORIZED,
      code: isSelf
        ? 'CANNOT_REMOVE_SELF'
        : isLastAdmin
        ? 'CANNOT_REMOVE_LAST_ADMIN'
        : 'UNAUTHORIZED',
    }
  }

  return { valid: true }
}

/**
 * Validate workspace ID format
 * @param workspaceId - Workspace ID to validate
 * @returns Validation result
 */
export function validateWorkspaceId(workspaceId: string): ValidationResult {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!workspaceId || !uuidRegex.test(workspaceId)) {
    return {
      valid: false,
      error: 'Invalid workspace ID format',
      code: 'INVALID_WORKSPACE_ID',
    }
  }

  return { valid: true }
}

/**
 * Validate user ID format
 * @param userId - User ID to validate
 * @returns Validation result
 */
export function validateUserId(userId: string): ValidationResult {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!userId || !uuidRegex.test(userId)) {
    return {
      valid: false,
      error: 'Invalid user ID format',
      code: 'INVALID_USER_ID',
    }
  }

  return { valid: true }
}

/**
 * Sanitize role input
 * Ensures role is lowercase and trimmed
 * @param role - Role string to sanitize
 * @returns Sanitized role or null if invalid
 */
export function sanitizeRole(role: string): UserRole | null {
  const sanitized = role.trim().toLowerCase()
  return isValidRole(sanitized) ? sanitized : null
}

/**
 * Validate admin count
 * Ensures workspace has at least one admin
 * @param adminCount - Number of admins
 * @returns Validation result
 */
export function validateAdminCount(adminCount: number): ValidationResult {
  if (adminCount < 1) {
    return {
      valid: false,
      error: 'Workspace must have at least one admin',
      code: 'NO_ADMIN',
    }
  }

  return { valid: true }
}

/**
 * Validate workspace capacity
 * Checks if workspace can accept new members
 * @param currentMemberCount - Current number of members
 * @param maxMembers - Maximum allowed members
 * @returns Validation result
 */
export function validateWorkspaceCapacity(
  currentMemberCount: number,
  maxMembers: number
): ValidationResult {
  if (currentMemberCount >= maxMembers) {
    return {
      valid: false,
      error: `Workspace is at capacity (${maxMembers} members)`,
      code: 'WORKSPACE_FULL',
    }
  }

  return { valid: true }
}

/**
 * Batch validation for multiple checks
 * @param validations - Array of validation results
 * @returns Combined validation result (fails if any validation fails)
 */
export function validateAll(validations: ValidationResult[]): ValidationResult {
  const failed = validations.find((v) => !v.valid)

  if (failed) {
    return failed
  }

  return { valid: true }
}

/**
 * Error codes for role operations
 */
export const ROLE_ERROR_CODES = {
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_USER_ID: 'INVALID_USER_ID',
  INVALID_WORKSPACE_ID: 'INVALID_WORKSPACE_ID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NO_CHANGE: 'NO_CHANGE',
  CANNOT_CHANGE_OWN_ROLE: 'CANNOT_CHANGE_OWN_ROLE',
  CANNOT_REMOVE_SELF: 'CANNOT_REMOVE_SELF',
  CANNOT_DEMOTE_LAST_ADMIN: 'CANNOT_DEMOTE_LAST_ADMIN',
  CANNOT_REMOVE_LAST_ADMIN: 'CANNOT_REMOVE_LAST_ADMIN',
  NO_ADMIN: 'NO_ADMIN',
  WORKSPACE_FULL: 'WORKSPACE_FULL',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
} as const

export type RoleErrorCode = (typeof ROLE_ERROR_CODES)[keyof typeof ROLE_ERROR_CODES]
