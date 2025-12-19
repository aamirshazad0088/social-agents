/**
 * MIDDLEWARE EXPORTS
 * Central export point for all middleware utilities
 */

// API Handler - Primary wrapper for all API routes
export {
  apiHandler,
  authApiHandler,
  adminApiHandler,
  editorApiHandler,
  successResponse,
  successResponseWithCache,
  createdResponse,
  noContentResponse,
  throwValidationError,
  throwNotFoundError,
  throwForbiddenError,
  throwUnauthorizedError,
  throwDatabaseError,
  type ApiHandler,
  type AuthenticatedApiHandler,
  type HandlerContext,
  type AuthenticatedHandlerContext,
  type ApiHandlerOptions
} from './apiHandler'

// Authentication utilities
export {
  getAuthUser,
  getUserWorkspace,
  createRequestContext,
  requireAdmin,
  requireEditor,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  extractRequestMetadata,
  generateRequestId,
  withAuth,
  withAdminAuth,
  withEditorAuth,
  type AuthenticatedHandler,
  type WithAuthOptions
} from './auth'

// Response handlers (legacy - prefer apiHandler)
export {
  successResponse as legacySuccessResponse,
  successResponseWithCache as legacySuccessResponseWithCache,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  cursorPaginatedResponse,
  handleAsync,
  isSuccessResponse,
  isErrorResponse,
  extractResponseData
} from './responseHandler'
