import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const maxDuration = 60;

/**
 * POST - Get a signed URL for direct upload to Supabase Storage
 * This bypasses the API body size limit by allowing direct client-to-storage uploads
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, contentType, folder = 'uploads' } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Generate unique file path
    const fileExt = fileName.split('.').pop() || 'bin';
    const uniqueFileName = `${folder}/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Create signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUploadUrl(uniqueFileName);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get the public URL for after upload completes
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(uniqueFileName);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: uniqueFileName,
      publicUrl: urlData.publicUrl,
    });
  } catch (error: any) {
    console.error('Signed URL generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
