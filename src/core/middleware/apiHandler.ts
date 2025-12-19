/**
 * API HANDLER WRAPPER
 * Provides consistent error handling, request context, and Supabase client caching
 * for all API routes. This eliminates duplicate boilerplate across routes.
 * 
 * Features:
 * - Automatic error handling with proper response formatting
 * - Request-scoped Supabase client caching via withRequestContext
 * - Request ID generation for tracing
 * - Zod validation error handling
 * - Authentication integration (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { withRequestContext } from '@/lib/supabase/server'
import { 
  AppError, 
  isAppError, 
  toAppError, 
  logError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  DatabaseError
} from '@/core/errors/AppError'
import { createRequestContext, extractRequestMetadata, generateRequestId } from './auth'
import type { RequestContext } from '@/types/context'
import { hasPermission, type Permission, PERMISSION_ERRORS } from '@/lib/permissions'

// ============================================================================
// Types
// ============================================================================

/**
 * Handler context provided to all API handlers
 */
export interface HandlerContext {
  /** Unique request ID for tracing */
  requestId: string
  /** Client IP address */
  ip: string
  /** Client user agent */
  userAgent: string
}

/**
 * Authenticated handler context (extends HandlerContext with auth info)
 */
export interface AuthenticatedHandlerContext extends HandlerContext {
  /** Full request context with user/workspace info */
  auth: RequestContext
}

/**
 * Basic API handler function type (no auth required)
 */
export type ApiHandler = (
  request: NextRequest,
  context: HandlerContext
) => Promise<NextResponse>

/**
 * Authenticated API handler function type
 */
export type AuthenticatedApiHandler = (
  request: NextRequest,
  context: AuthenticatedHandlerContext
) => Promise<NextResponse>

/**
 * Options for API handler wrapper
 */
export interface ApiHandlerOptions {
  /** Require authentication */
  requireAuth?: boolean
  /** Required role(s) - user must have one of these roles */
  roles?: Array<'admin' | 'editor' | 'viewer'>
  /** Required permission(s) - user must have ALL of these */
  permissions?: Permission[]
  /** Required permission(s) - user must have ANY of these */
  anyPermissions?: Permission[]
}

// ============================================================================
// Error Response Helpers
// ============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse(
  error: AppError,
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      requestId
    },
    { status: error.statusCode }
  )
}

/**
 * Create a validation error response from ZodError
 */
function createValidationErrorResponse(
  error: ZodError,
  requestId: string
): NextResponse {
  const details: Record<string, string[]> = {}

  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    if (!details[path]) {
      details[path] = []
    }
    details[path].push(issue.message)
  })

  return NextResponse.json(
    {
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details,
      requestId
    },
    { status: 400 }
  )
}

// ============================================================================
// Main API Handler Wrapper
// ============================================================================

/**
 * Wrap an API handler with consistent error handling and request context
 * 
 * @example
 * // Basic usage (no auth)
 * export const GET = apiHandler(async (request, { requestId }) => {
 *   const data = await fetchData()
 *   return NextResponse.json({ success: true, data })
 * })
 * 
 * @example
 * // With authentication
 * export const POST = apiHandler(
 *   async (request, { auth }) => {
 *     const { userId, workspaceId } = auth
 *     // ... handler logic
 *     return NextResponse.json({ success: true, data })
 *   },
 *   { requireAuth: true }
 * )
 * 
 * @example
 * // With role requirement
 * export const DELETE = apiHandler(
 *   async (request, { auth }) => {
 *     // Only admins can reach here
 *     return NextResponse.json({ success: true })
 *   },
 *   { requireAuth: true, roles: ['admin'] }
 * )
 */
export function apiHandler(
  handler: ApiHandler | AuthenticatedApiHandler,
  options: ApiHandlerOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const { ip, userAgent } = extractRequestMetadata(request)

    // Wrap everything in request context for Supabase client caching
    return withRequestContext(async () => {
      try {
        // Build handler context
        const baseContext: HandlerContext = {
          requestId,
          ip,
          userAgent
        }

        // If auth is required, create authenticated context
        if (options.requireAuth) {
          const authContext = await createRequestContext(requestId, ip, userAgent)

          // Check role requirements
          if (options.roles && options.roles.length > 0) {
            if (!options.roles.includes(authContext.userRole)) {
              throw new ForbiddenError(
                `One of roles required: ${options.roles.join(', ')}`
              )
            }
          }

          // Check ALL permissions requirement
          if (options.permissions && options.permissions.length > 0) {
            const hasAll = options.permissions.every((permission) =>
              hasPermission(authContext.userRole, permission)
            )
            if (!hasAll) {
              throw new ForbiddenError(PERMISSION_ERRORS.UNAUTHORIZED)
            }
          }

          // Check ANY permissions requirement
          if (options.anyPermissions && options.anyPermissions.length > 0) {
            const hasAny = options.anyPermissions.some((permission) =>
              hasPermission(authContext.userRole, permission)
            )
            if (!hasAny) {
              throw new ForbiddenError(PERMISSION_ERRORS.UNAUTHORIZED)
            }
          }

          // Call handler with authenticated context
          const authenticatedContext: AuthenticatedHandlerContext = {
            ...baseContext,
            auth: authContext
          }
          return await (handler as AuthenticatedApiHandler)(request, authenticatedContext)
        }

        // Call handler with basic context
        return await (handler as ApiHandler)(request, baseContext)

      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
          return createValidationErrorResponse(error, requestId)
        }

        // Handle known AppErrors
        if (isAppError(error)) {
          logError(error, { requestId, ip, userAgent })
          return createErrorResponse(error, requestId)
        }

        // Convert unknown errors to AppError and respond
        const appError = toAppError(error)
        logError(error, { requestId, ip, userAgent })
        return createErrorResponse(appError, requestId)
      }
    })
  }
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Wrap an authenticated API handler (shorthand for requireAuth: true)
 */
export function authApiHandler(
  handler: AuthenticatedApiHandler,
  options: Omit<ApiHandlerOptions, 'requireAuth'> = {}
): (request: NextRequest) => Promise<NextResponse> {
  return apiHandler(handler, { ...options, requireAuth: true })
}

/**
 * Wrap an admin-only API handler
 */
export function adminApiHandler(
  handler: AuthenticatedApiHandler
): (request: NextRequest) => Promise<NextResponse> {
  return apiHandler(handler, { requireAuth: true, roles: ['admin'] })
}

/**
 * Wrap an editor+ API handler (admin or editor)
 */
export function editorApiHandler(
  handler: AuthenticatedApiHandler
): (request: NextRequest) => Promise<NextResponse> {
  return apiHandler(handler, { requireAuth: true, roles: ['admin', 'editor'] })
}

// ============================================================================
// Response Helpers (for use inside handlers)
// ============================================================================

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status: statusCode }
  )
}

/**
 * Create a success response with cache headers
 */
export function successResponseWithCache<T>(
  data: T,
  cacheControl: string,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { 
      status: statusCode,
      headers: {
        'Cache-Control': cacheControl
      }
    }
  )
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T, message?: string): NextResponse {
  return successResponse(data, 201, message)
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Throw a validation error (for use in handlers)
 */
export function throwValidationError(message: string, details?: Record<string, unknown>): never {
  throw new ValidationError(message, details)
}

/**
 * Throw a not found error (for use in handlers)
 */
export function throwNotFoundError(resource: string): never {
  throw new NotFoundError(resource)
}

/**
 * Throw a forbidden error (for use in handlers)
 */
export function throwForbiddenError(message?: string): never {
  throw new ForbiddenError(message)
}

/**
 * Throw an unauthorized error (for use in handlers)
 */
export function throwUnauthorizedError(message?: string): never {
  throw new UnauthorizedError(message)
}

/**
 * Throw a database error (for use in handlers)
 */
export function throwDatabaseError(message: string, details?: Record<string, unknown>): never {
  throw new DatabaseError(message, details)
}
