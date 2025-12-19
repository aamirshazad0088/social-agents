/**
 * API Route: /api/workspace/activity/[id]
 * Methods: DELETE
 *
 * DELETE: Delete a specific activity log entry (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * DELETE /api/workspace/activity/[id]
 * Delete a specific activity log entry
 * Requires: Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      .select('workspace_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only admins can delete activity logs
    if ((userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete activity logs' },
        { status: 403 }
      )
    }

    // Delete the activity log entry
    const { error: deleteError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id)
      .eq('workspace_id', (userData as any).workspace_id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete activity log' },
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
