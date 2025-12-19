/**
 * Pending Comments API
 * GET /api/comments/pending - Fetch comments needing user attention
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface UserData {
  workspace_id: string;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single() as { data: UserData | null };

    if (!userData?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const platform = searchParams.get('platform');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('pending_comments')
      .select('*', { count: 'exact' })
      .eq('workspace_id', userData.workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Only show pending comments (ones that need reply)
    // Replied/dismissed are deleted, not stored
    query = query.eq('status', 'pending');
    
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: comments, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Stats - only pending comments exist in DB now
    const stats = {
      pending: count || 0,
      total: count || 0,
    };

    return NextResponse.json({
      success: true,
      comments: comments || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pending comments' },
      { status: 500 }
    );
  }
}
