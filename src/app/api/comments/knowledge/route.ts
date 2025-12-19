/**
 * Company Knowledge API
 * GET /api/comments/knowledge - Fetch knowledge entries
 * POST /api/comments/knowledge - Add new knowledge entry
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
    const category = searchParams.get('category');

    // Build query
    let query = (supabase
      .from('company_knowledge') as any)
      .select('*')
      .eq('workspace_id', userData.workspace_id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      entries: entries || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, title, question, answer, keywords } = body;

    if (!category || !title || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, answer' },
        { status: 400 }
      );
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

    // Insert new knowledge entry
    const { data, error } = await (supabase
      .from('company_knowledge') as any)
      .insert({
        workspace_id: userData.workspace_id,
        category,
        title,
        question: question || null,
        answer,
        keywords: keywords || [],
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add knowledge' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      entry: data,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add knowledge' }, { status: 500 });
  }
}
