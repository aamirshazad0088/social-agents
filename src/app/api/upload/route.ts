import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { base64Data, fileName, workspaceId } = body;


    if (!base64Data || !fileName) {
      return NextResponse.json(
        { error: 'base64Data and fileName required' },
        { status: 400 }
      );
    }

    // Use user.id if workspaceId not provided
    const folderPath = workspaceId || user.id;

    // Extract base64 content and mime type
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid base64 data URL format' },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    
    // Convert base64 to buffer
    let buffer;
    try {
      buffer = Buffer.from(base64Content, 'base64');
    } catch (bufferError) {
      return NextResponse.json(
        { error: 'Failed to process image data' },
        { status: 400 }
      );
    }
    
    // Log file size for debugging
    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    
    // Generate unique file path with proper extension
    const timestamp = Date.now();
    const extension = mimeType.split('/')[1]?.replace('quicktime', 'mov') || 'png';
    const filePath = `${folderPath}/${timestamp}-${fileName}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    
    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
