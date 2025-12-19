/**
 * WORKSPACE API ROUTES
 * GET /api/workspace - Get workspace details
 * PATCH /api/workspace - Update workspace (admin)
 * DELETE /api/workspace - Delete workspace (admin)
 *
 * Architecture Pattern:
 * Request → apiHandler → Authentication → Validation → Service → Repository → Database
 */

import { 
  authApiHandler, 
  adminApiHandler,
  successResponse,
  successResponseWithCache
} from '@/core/middleware/apiHandler'
import { getWorkspaceService } from '@/services/WorkspaceService'
import { UpdateWorkspaceSchema } from '@/lib/validation/schemas'

/**
 * GET /api/workspace
 * Get current workspace details
 *
 * Authentication: Required
 * Authorization: Any authenticated user
 */
export const GET = authApiHandler(async (request, { auth }) => {
  const workspaceService = getWorkspaceService()
  const workspace = await workspaceService.getWorkspace(auth)
  // Cache workspace data for 5 minutes (private, user-specific)
  return successResponseWithCache(workspace, 'private, max-age=300, stale-while-revalidate=600')
})

/**
 * PATCH /api/workspace
 * Update workspace settings (admin only)
 *
 * Authentication: Required
 * Authorization: Admin role only
 */
export const PATCH = adminApiHandler(async (request, { auth }) => {
  const body = await request.json()
  const validatedData = UpdateWorkspaceSchema.parse(body)

  const workspaceService = getWorkspaceService()
  const updated = await workspaceService.updateWorkspace(auth, validatedData)

  return successResponse(updated)
})

/**
 * DELETE /api/workspace
 * Delete/deactivate workspace (admin only)
 *
 * Authentication: Required
 * Authorization: Admin role only
 */
export const DELETE = adminApiHandler(async (request, { auth }) => {
  const workspaceService = getWorkspaceService()
  await workspaceService.deleteWorkspace(auth)

  return successResponse({ message: 'Workspace deleted successfully' })
})
