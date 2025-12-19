/**
 * Canva Export API Route
 * Export Canva designs back to Media Studio library
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MediaLibraryService } from '@/services/database/mediaLibraryService';
import { detectMediaType } from '@/utils/mediaTypeUtils';

/**
 * Download a file from URL and upload to Supabase storage
 * This converts temporary Canva URLs to permanent Supabase URLs
 */
async function downloadAndUploadToStorage(
  url: string,
  fileName: string,
  bucket: string = 'media'
): Promise<string> {
  const supabase = await createServerClient();
  
  // Download the file from Canva
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type') || 'image/png';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Log file size
  const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  
  // Generate unique file path
  const timestamp = Date.now();
  const extension = contentType.split('/')[1]?.replace('quicktime', 'mov') || 'png';
  const filePath = `canva/${timestamp}-${fileName}.${extension}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }
  
  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return publicUrlData.publicUrl;
}

// Extend timeout for video exports (5 minutes max)
export const maxDuration = 300;

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

  // Check if token is expired
  if (new Date(data.expires_at) <= new Date()) {
    // Token expired - would need refresh logic here
    return null;
  }

  return data.access_token;
}

/**
 * POST /api/canva/export
 * Export a Canva design and save to media library
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
    const { designId, workspaceId, format = 'png', quality = 'high', saveToLibrary = true } = body;


    if (!designId || !workspaceId) {
      return NextResponse.json(
        { error: 'designId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Fetch design details first to determine orientation and title
    const designResponse = await fetch(
      `https://api.canva.com/rest/v1/designs/${designId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    let designTitle = 'Canva Design';
    let isVertical = false;
    let pageCount = 1;

    if (designResponse.ok) {
      const designData = await designResponse.json();
      designTitle = designData.design?.title || designTitle;
      pageCount = designData.design?.page_count || 1;

      // Check orientation from thumbnail dimensions
      const thumb = designData.design?.thumbnail;
      if (thumb && thumb.height > thumb.width) {
        isVertical = true;
      }
      
    }


    // Check available export formats to validate the requested format
    const formatsResponse = await fetch(
      `https://api.canva.com/rest/v1/designs/${designId}/export-formats`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    // Use the format requested by the client
    let actualFormat = format;

    if (formatsResponse.ok) {
      const formatsData = await formatsResponse.json();
      
      // Validate that the requested format is available
      if (format === 'mp4' && !formatsData.formats?.mp4) {
        actualFormat = 'png';
      } else if (format !== 'mp4' && !formatsData.formats?.[format]) {
        // If requested image format not available, try png
        actualFormat = 'png';
      }
    }

    // Determine MP4 quality based on orientation
    const mp4Quality = isVertical ? 'vertical_1080p' : 'horizontal_1080p';

    // Start export job - explicitly request all pages for multi-page designs

    // Build pages array for multi-page designs (1-indexed)
    // If pages isn't specified, Canva should export all pages, but we explicitly request them
    const pagesToExport = pageCount > 1 ? Array.from({ length: pageCount }, (_, i) => i + 1) : undefined;
    
    // Build the export request body
    const exportRequestBody = {
      design_id: designId,
      format: {
        type: actualFormat, // png, jpg, pdf, mp4, gif
        ...(actualFormat === 'jpg' && { quality: quality === 'high' ? 100 : quality === 'medium' ? 75 : 50 }),
        ...(actualFormat === 'mp4' && { quality: mp4Quality }),
        // Explicitly request all pages for image formats (not video)
        ...(pagesToExport && actualFormat !== 'mp4' && { pages: pagesToExport }),
      },
      export_quality: quality === 'high' ? 'pro' : 'regular',
    };
    

    const exportResponse = await fetch(
      'https://api.canva.com/rest/v1/exports',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequestBody),
      }
    );


    if (!exportResponse.ok) {
      const error = await exportResponse.text();
      return NextResponse.json(
        { error: `Failed to start export: ${error}` },
        { status: exportResponse.status }
      );
    }

    const exportJob = await exportResponse.json();

    const jobId = exportJob.job?.id;

    if (!jobId) {
      return NextResponse.json(
        { error: 'No export job ID returned' },
        { status: 500 }
      );
    }


    // Poll for export completion - video exports take longer
    // Use longer timeout for MP4 (120 seconds) vs images (30 seconds)
    const maxAttempts = actualFormat === 'mp4' ? 120 : 30;
    const pollInterval = actualFormat === 'mp4' ? 2000 : 1000; // 2s for video, 1s for images
    
    let exportUrl: string | null = null;
    let allExportUrls: string[] = [];
    let attempts = 0;


    while (attempts < maxAttempts) {
      attempts++;
      
      if (attempts % 10 === 0 || attempts <= 3) {
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(
        `https://api.canva.com/rest/v1/exports/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (attempts % 10 === 0 || statusData.job?.status !== 'in_progress') {
        }

        if (statusData.job?.status === 'success') {
          // Log the full response for debugging
          
          // Get all URLs for multi-page designs (carousels/slides)
          allExportUrls = statusData.job.urls || [];
          exportUrl = allExportUrls[0];
          
          
          if (allExportUrls.length > 1) {
          } else if (pageCount > 1) {
          }
          break;
        } else if (statusData.job?.status === 'failed') {
          return NextResponse.json(
            { error: 'Export failed: ' + (statusData.job.error?.message || 'Unknown error') },
            { status: 500 }
          );
        }
        // Continue polling for 'in_progress' or other statuses
      } else {
      }
    }

    if (!exportUrl) {
      const timeoutSeconds = (maxAttempts * pollInterval) / 1000;
      return NextResponse.json(
        { error: `Export timed out after ${timeoutSeconds} seconds. Video exports may take longer - please try again.` },
        { status: 504 }
      );
    }

    // Detect media type from the actual export URL - most reliable method
    // This detects based on file extension in URL (e.g., .png, .mp4, .jpg)
    const mediaType = detectMediaType({ url: exportUrl, format: actualFormat });


    // IMPORTANT: Download from Canva and upload to Supabase storage
    // Canva URLs are temporary (expire in ~8 hours), we need permanent URLs
    
    let permanentUrls: string[] = [];
    try {
      // Upload all URLs (for multi-page/carousel designs)
      for (let i = 0; i < allExportUrls.length; i++) {
        const canvaUrl = allExportUrls[i];
        const fileName = `${designId}-page-${i + 1}`;
        
        const permanentUrl = await downloadAndUploadToStorage(canvaUrl, fileName);
        permanentUrls.push(permanentUrl);
      }
    } catch (uploadError) {
      // Fall back to Canva URLs if upload fails (they'll work for ~8 hours)
      permanentUrls = allExportUrls;
    }

    // Use the first permanent URL for the main media item
    const finalExportUrl = permanentUrls[0];

    // Only save to media library if saveToLibrary is true
    let mediaItem = null;
    if (saveToLibrary) {
      mediaItem = await MediaLibraryService.createMediaItem(
        {
          type: mediaType,
          source: 'edited', // Canva edits are considered edited media
          url: finalExportUrl,
          prompt: `Edited in Canva: ${designTitle}`,
          model: 'canva',
          config: {
            canvaDesignId: designId,
            exportFormat: actualFormat,
            exportQuality: quality,
            detectedMediaType: mediaType,
            // Store all URLs for carousel support
            allUrls: permanentUrls.length > 1 ? permanentUrls : undefined,
          },
          metadata: {
            source: 'canva',
            designId,
            designTitle,
            exportedAt: new Date().toISOString(),
            pageCount: permanentUrls.length,
          },
          tags: ['canva', 'edited', mediaType], // Add media type as tag for easy filtering
        },
        user.id,
        workspaceId
      );
    } else {
    }

    // Return permanent URLs for multi-page designs (carousel support)
    const additionalUrls = permanentUrls.length > 1 ? permanentUrls.slice(1) : [];
    
    return NextResponse.json({
      success: true,
      mediaItem,
      exportUrl: finalExportUrl,
      // Include all permanent URLs for carousel/multi-page support
      allExportUrls: permanentUrls.length > 1 ? permanentUrls : undefined,
      additionalUrls: additionalUrls.length > 0 ? additionalUrls : undefined,
      isMultiPage: permanentUrls.length > 1,
      pageCount: permanentUrls.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export design' },
      { status: 500 }
    );
  }
}
