/**
 * API Route: /api/workspace/activity/log
 * Methods: POST
 *
 * POST: Log a content activity (publish, delete, schedule)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { logWorkspaceAction, WorkspaceAuditAction } from '@/services/database/auditLogService'

/**
 * POST /api/workspace/activity/log
 * Log a content activity
 *
 * Body:
 *   - action: 'post_published' | 'post_scheduled' | 'post_deleted'
 *   - postId: string
 *   - postTitle: string (optional)
 *   - platforms: string[] (optional, for publish)
 *   - scheduledAt: string (optional, for schedule)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's workspace and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('workspace_id, role, full_name, email')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { workspace_id: workspaceId, role, full_name, email } = userData as any

    // Only admins and editors can log content activities
    if (role !== 'admin' && role !== 'editor') {
      return NextResponse.json(
        { error: 'Only admins and editors can perform this action' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, postId, postTitle, platforms, scheduledAt } = body

    // Validate action
    const validActions: WorkspaceAuditAction[] = ['post_published', 'post_scheduled', 'post_deleted']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Build details object
    const details: Record<string, any> = {
      post_title: postTitle || 'Untitled',
      user_name: full_name || email,
      user_email: email,
    }

    if (action === 'post_published' && platforms) {
      details.platforms = platforms
      details.platform_count = platforms.length
    }

    if (action === 'post_scheduled' && scheduledAt) {
      details.scheduled_at = scheduledAt
    }

    // Log the activity
    await logWorkspaceAction({
      workspaceId,
      userId: user.id,
      action,
      entityType: 'post',
      entityId: postId,
      details,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
