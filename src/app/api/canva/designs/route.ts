/**
 * Canva Designs API Route
 * Create, list, and export designs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadBase64Image } from '@/lib/supabase/storage';

/**
 * Get Canva access token for user
 */
async function getCanvaToken(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await (supabase
    .from('user_integrations') as any)
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'canva')
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token is expired and refresh if needed
  if (new Date(data.expires_at) <= new Date()) {
    const refreshed = await refreshCanvaToken(userId, data.refresh_token);
    return refreshed;
  }

  return data.access_token;
}

/**
 * Refresh Canva access token
 */
async function refreshCanvaToken(userId: string, refreshToken: string) {
  const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
  const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;

  const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const tokens = await response.json();

  // Update tokens in database
  const supabase = await createServerClient();
  await (supabase
    .from('user_integrations') as any)
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'canva');

  return tokens.access_token;
}

/**
 * GET /api/canva/designs
 * List user's Canva designs
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getCanvaToken(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Canva not connected', needsAuth: true },
        { status: 401 }
      );
    }

    const response = await fetch('https://api.canva.com/rest/v1/designs', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch designs' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/canva/designs
 * Create a new design from media library asset
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getCanvaToken(user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Canva not connected', needsAuth: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assetUrl, designType = 'Document', width, height, assetType } = body;


    // First, upload the asset to Canva
    let assetId: string | null = null;
    if (assetUrl) {

      try {
        // Use the correct Canva API endpoint for URL uploads: /v1/url-asset-uploads
        const uploadResponse = await fetch('https://api.canva.com/rest/v1/url-asset-uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Media Studio Asset',
            url: assetUrl,
          }),
        });


        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();

          // Extract the job ID from the response
          const jobId = uploadData.job?.id;

          if (jobId) {

            // Poll for upload completion (wait up to 30 seconds)
            let attempts = 0;
            const maxAttempts = 30;

            while (attempts < maxAttempts) {
              attempts++;

              await new Promise(resolve => setTimeout(resolve, 1000));

              try {
                const statusResponse = await fetch(
                  `https://api.canva.com/rest/v1/url-asset-uploads/${jobId}`,
                  {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                  }
                );

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();

                  const jobStatus = statusData.job?.status;

                  if (jobStatus === 'success') {
                    assetId = statusData.job?.asset?.id;
                    break;
                  } else if (jobStatus === 'failed') {
                    break;
                  } else {
                  }
                } else {
                  const errorText = await statusResponse.text();
                }
              } catch (pollError) {
              }
            }

            if (attempts >= maxAttempts && !assetId) {
            }
          } else {
          }
        } else {
          const errorText = await uploadResponse.text();
        }
      } catch (uploadError) {
      }
    }

    // Create the design
    // Canva API requires design_type as an object with type and name

    // 1. Standard Presets
    const presetMap: Record<string, string> = {
      'Document': 'doc',
      'Presentation': 'presentation',
      'Whiteboard': 'whiteboard',
    };

    // 2. Custom Dimensions for Social Media & Video
    const dimensionMap: Record<string, { width: number; height: number }> = {
      'Video': { width: 1920, height: 1080 },
      'Instagram Post': { width: 1080, height: 1080 },
      'Instagram Story': { width: 1080, height: 1920 },
      'Facebook Post': { width: 1200, height: 630 },
      'Twitter Post': { width: 1200, height: 675 },
    };

    let designTypePayload;

    if (width && height && width > 0 && height > 0) {
      // 1. Use detected dimensions from client (Exact Match)
      designTypePayload = {
        type: 'custom',
        width: width,
        height: height,
        unit: 'px'
      };
    } else if (dimensionMap[designType]) {
      // 2. Use standard dimensions for format
      const dims = dimensionMap[designType];
      designTypePayload = {
        type: 'custom',
        width: dims.width,
        height: dims.height,
        unit: 'px'
      };
    } else {
      // 3. Use preset or default to doc
      designTypePayload = {
        type: 'preset',
        name: presetMap[designType] || 'doc',
      };
    }

    const designPayload: any = {
      title: 'Media Studio Asset',
      design_type: designTypePayload,
    };

    // Only include asset_id if we successfully uploaded an asset AND it is an image
    // (Canva create_design endpoint does not support video asset_id)
    if (assetId && assetType !== 'video') {
      designPayload.asset_id = assetId;
    } else {
      if (assetType === 'video') {
      } else {
      }
    }


    const createResponse = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(designPayload),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      return NextResponse.json(
        { error: 'Failed to create design' },
        { status: createResponse.status }
      );
    }

    const design = await createResponse.json();
    return NextResponse.json({ success: true, design });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create design' },
      { status: 500 }
    );
  }
}
