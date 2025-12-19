
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Public proxy for TikTok verification
  // TODO: Add domain whitelisting or signature verification for security
  /*
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  */

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to proxy media' }, { status: 500 });
  }
}
