/**
 * Single Knowledge Entry API
 * PATCH /api/comments/knowledge/[id] - Update a knowledge entry
 * DELETE /api/comments/knowledge/[id] - Delete a knowledge entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface UserData {
  workspace_id: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single() as { data: UserData | null };

    if (!userData?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Update the knowledge entry
    const { data, error } = await (supabase
      .from('company_knowledge') as any)
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', userData.workspace_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update knowledge' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update knowledge' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get user's workspace
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single() as { data: UserData | null };

    if (!userData?.workspace_id) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Delete the knowledge entry
    const { error } = await (supabase
      .from('company_knowledge') as any)
      .delete()
      .eq('id', id)
      .eq('workspace_id', userData.workspace_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete knowledge' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete knowledge' }, { status: 500 });
  }
}
