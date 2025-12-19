/**
 * Bulk Delete Pending Comments API
 * DELETE /api/comments/pending/bulk-delete?status=replied|pending|all
 * 
 * Deletes multiple comments from the database based on status filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface UserData {
  workspace_id: string;
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single() as { data: UserData | null };

    if (!userData?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Hard delete all pending comments
    // API check will prevent re-escalation if user already replied on platform
    const { data, error } = await (supabase.from('pending_comments') as any)
      .delete()
      .eq('workspace_id', userData.workspace_id)
      .eq('status', 'pending')
      .select();

    if (error) {
      return NextResponse.json({ error: 'Failed to delete comments' }, { status: 500 });
    }

    const deletedCount = data?.length || 0;

    return NextResponse.json({ 
      success: true, 
      deleted: deletedCount,
      status: status
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete comments' }, { status: 500 });
  }
}
