import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

// For App Router: Set max duration for large uploads
export const maxDuration = 300; // 5 minutes

/**
 * POST - Upload a file to Supabase Storage
 * Supports both base64 JSON and FormData file uploads
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle FormData file upload (for direct file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const folder = formData.get('folder') as string || 'uploads';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${folder}/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return NextResponse.json({
        url: urlData.publicUrl,
        path: fileName,
        message: 'File uploaded successfully',
      });
    }

    // Handle base64 JSON upload (legacy support)
    const body = await request.json();
    const { base64Data, fileName, type = 'image' } = body;

    if (!base64Data || !fileName) {
      return NextResponse.json(
        { error: 'base64Data and fileName required' },
        { status: 400 }
      );
    }

    // Upload to storage
    const publicUrl = await uploadBase64Image(base64Data, fileName);

    return NextResponse.json({
      url: publicUrl,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
