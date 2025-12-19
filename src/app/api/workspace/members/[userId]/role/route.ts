/**
 * API Route: /api/workspace/members/[userId]/role
 * Methods: PATCH
 *
 * PATCH: Change a member's role (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkspaceService } from '@/services/database/workspaceService'
import type { UserRole } from '@/types/workspace'
import { validateRoleChange, validateUserId, sanitizeRole } from '@/lib/roleValidation'
import { isValidRole } from '@/lib/permissions'

/**
 * PATCH /api/workspace/members/[userId]/role
 * Change a member's role
 * Requires: Admin role
 *
 * Params: userId - User ID to change role for
 * Body: { role: 'admin' | 'editor' | 'viewer' }
 * Response: { success: true } or { error: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params for Next.js 15+ compatibility
    const { userId } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's role and workspace
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !('workspace_id' in userData)) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    if ((userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workspace admins can change member roles' },
        { status: 403 }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const newRole = body.role as UserRole

    // Validate userId format
    const userIdValidation = validateUserId(userId)
    if (!userIdValidation.valid) {
      return NextResponse.json(
        { error: userIdValidation.error, code: userIdValidation.code },
        { status: 400 }
      )
    }

    // Sanitize and validate role
    const sanitizedRole = sanitizeRole(newRole)
    if (!sanitizedRole) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, editor, or viewer', code: 'INVALID_ROLE' },
        { status: 400 }
      )
    }

    // Get target user's current role
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('workspace_id', (userData as any).workspace_id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Count admins in workspace
    const { count: adminCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', (userData as any).workspace_id)
      .eq('role', 'admin')

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to validate admin count', code: 'VALIDATION_ERROR' },
        { status: 500 }
      )
    }

    // Validate role change operation
    const validation = validateRoleChange({
      currentUserRole: (userData as any).role,
      currentUserId: user.id,
      targetUserId: userId,
      targetCurrentRole: (targetUser as any).role,
      newRole: sanitizedRole,
      adminCount: adminCount || 0,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 403 }
      )
    }

    // Change the role
    const success = await WorkspaceService.changeMemberRole(
      (userData as any).workspace_id,
      userId,
      sanitizedRole,
      user.id
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to change member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
