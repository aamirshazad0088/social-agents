/**
 * AUTH MIDDLEWARE WRAPPER
 * Provides a reusable HOF to handle authentication in API routes
 * Eliminates duplicate auth logic across routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRequestContext, extractRequestMetadata, generateRequestId } from './auth'
import type { RequestContext } from '@/types/context'
import { UnauthorizedError, ForbiddenError } from '@/core/errors'
import type { Permission } from '@/lib/permissions'
import { hasPermission, PERMISSION_ERRORS } from '@/lib/permissions'

/**
 * Handler function type with request context
 */
export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  context: RequestContext
) => Promise<NextResponse<T>>

/**
 * Options for the withAuth middleware
 */
export interface WithAuthOptions {
  /** Required role(s) - user must have one of these roles */
  roles?: Array<'admin' | 'editor' | 'viewer'>
  /** Required permission(s) - user must have ALL of these */
  permissions?: Permission[]
  /** Required permission(s) - user must have ANY of these */
  anyPermissions?: Permission[]
}

/**
 * Higher-order function that wraps an API route handler with authentication
 * 
 * @example
 * // Basic usage - just authentication
 * export const GET = withAuth(async (request, context) => {
 *   const { userId, workspaceId } = context
 *   // ... handler logic
 *   return NextResponse.json({ data })
 * })
 * 
 * @example
 * // With role requirement
 * export const POST = withAuth(
 *   async (request, context) => {
 *     // ... handler logic
 *     return NextResponse.json({ data })
 *   },
 *   { roles: ['admin', 'editor'] }
 * )
 * 
 * @example
 * // With permission requirement
 * export const DELETE = withAuth(
 *   async (request, context) => {
 *     // ... handler logic
 *     return NextResponse.json({ success: true })
 *   },
 *   { permissions: ['manage_users'] }
 * )
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>,
  options: WithAuthOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract request metadata
      const { ip, userAgent } = extractRequestMetadata(request)
      const requestId = generateRequestId()

      // Create authenticated context (handles auth validation)
      const context = await createRequestContext(requestId, ip, userAgent)

      // Check role requirements
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(context.userRole)) {
          throw new ForbiddenError(
            `One of roles required: ${options.roles.join(', ')}`
          )
        }
      }

      // Check ALL permissions requirement
      if (options.permissions && options.permissions.length > 0) {
        const hasAll = options.permissions.every((permission) =>
          hasPermission(context.userRole, permission)
        )
        if (!hasAll) {
          throw new ForbiddenError(PERMISSION_ERRORS.UNAUTHORIZED)
        }
      }

      // Check ANY permissions requirement
      if (options.anyPermissions && options.anyPermissions.length > 0) {
        const hasAny = options.anyPermissions.some((permission) =>
          hasPermission(context.userRole, permission)
        )
        if (!hasAny) {
          throw new ForbiddenError(PERMISSION_ERRORS.UNAUTHORIZED)
        }
      }

      // Call the actual handler with context
      return await handler(request, context)
    } catch (error) {
      // Handle known auth errors
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: error.message, code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      }

      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          { error: error.message, code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Re-throw unknown errors to be handled by caller
      throw error
    }
  }
}

/**
 * Convenience wrapper for admin-only routes
 */
export function withAdminAuth<T = any>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(handler, { roles: ['admin'] })
}

/**
 * Convenience wrapper for editor+ routes (admin or editor)
 */
export function withEditorAuth<T = any>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(handler, { roles: ['admin', 'editor'] })
}

export default withAuth
