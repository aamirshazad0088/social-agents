/**
 * API Route: Veo Video Download
 * POST /api/ai/media/veo/download
 * Download a generated video and optionally upload to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { downloadVeoVideo, getVeoVideoUrl } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import { uploadBase64Image } from '@/lib/supabase/storage';
import * as z from 'zod';

const veoDownloadSchema = z.object({
  veoVideoId: z.string().min(1, 'Veo video ID is required'),
  operationId: z.string().optional(),
  uploadToSupabase: z.boolean().optional().default(true),
});

/**
 * POST /api/ai/media/veo/download
 * Download a generated video
 * 
 * Request body:
 * {
 *   veoVideoId: string (Google's video file reference)
 *   operationId?: string
 *   uploadToSupabase?: boolean (default: true)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   url: string (Supabase URL if uploaded, or Google temporary URL)
 *   size: number
 *   format: string
 * }
 * 
 * Notes:
 * - Videos are stored on Google servers for only 2 days
 * - Download and save to Supabase for permanent storage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = veoDownloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { veoVideoId, operationId, uploadToSupabase } = validation.data;


    if (uploadToSupabase) {
      // Download video and upload to Supabase
      const downloadResult = await downloadVeoVideo({
        veoVideoId,
        operationId: operationId || '',
      });

      // Convert buffer to base64 for upload
      const base64Video = downloadResult.videoBuffer.toString('base64');
      const dataUrl = `data:video/mp4;base64,${base64Video}`;

      // Upload to Supabase storage (uploadBase64Image handles both images and videos)
      const filename = `veo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const supabaseUrl = await uploadBase64Image(dataUrl, filename);


      return NextResponse.json({
        success: true,
        url: supabaseUrl,
        size: downloadResult.size,
        format: downloadResult.format,
        source: 'supabase',
      });
    } else {
      // Just get the temporary Google URL
      const googleUrl = await getVeoVideoUrl(veoVideoId);

      return NextResponse.json({
        success: true,
        url: googleUrl,
        source: 'google',
        note: 'This URL is temporary and will expire. Videos are stored for 2 days.',
      });
    }
  } catch (error) {

    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 :
                        error.type === 'RATE_LIMIT' ? 429 :
                        error.type === 'VALIDATION_ERROR' ? 400 : 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download video',
      },
      { status: 500 }
    );
  }
}

