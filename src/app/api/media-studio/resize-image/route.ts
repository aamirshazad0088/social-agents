/**
 * API Route: Image Resize
 * Resize images for different social media platforms
 * Uses Sharp for server-side image processing
 * 
 * Features:
 * - High quality JPEG output (95 quality) for photos
 * - PNG output preserved for transparent images
 * - Smart format detection
 * - Comprehensive logging and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MediaLibraryService, CreateMediaItemInput } from '@/services/database/mediaLibraryService';

// Platform aspect ratio presets - 2024 Official Standards
const PLATFORM_PRESETS = {
  // Vertical (9:16) - Stories and Reels covers
  'instagram-story': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Instagram Story' },
  'facebook-story': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Facebook Story' },

  // Square (1:1) - Feed posts
  'instagram-post': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Instagram Post (Square)' },
  'facebook-post-square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Facebook Post (Square)' },
  'linkedin-square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'LinkedIn (Square)' },

  // Portrait (4:5) - Optimized for mobile feed
  'instagram-feed': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Instagram Feed (4:5)' },
  'facebook-feed': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Facebook Feed (4:5)' },

  // Landscape - Cover photos and headers
  'youtube-thumbnail': { width: 1280, height: 720, aspectRatio: '16:9', name: 'YouTube Thumbnail' },
  'facebook-cover': { width: 1640, height: 924, aspectRatio: '16:9', name: 'Facebook Cover' },
  'twitter-header': { width: 1500, height: 500, aspectRatio: '3:1', name: 'Twitter/X Header' },
  'linkedin-cover': { width: 1584, height: 396, aspectRatio: '4:1', name: 'LinkedIn Cover' },
};

export type PlatformPreset = keyof typeof PLATFORM_PRESETS;

/**
 * GET /api/media-studio/resize-image
 * Get available platform presets
 */
export async function GET() {
  return NextResponse.json({
    presets: Object.entries(PLATFORM_PRESETS).map(([key, value]) => ({
      id: key,
      ...value,
    })),
  });
}

/**
 * POST /api/media-studio/resize-image
 * Resize image for a specific platform
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
    const { workspaceId, imageUrl, platform, customWidth, customHeight } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
    }

    // Get target dimensions
    let targetWidth: number;
    let targetHeight: number;
    let platformName: string;

    if (platform && PLATFORM_PRESETS[platform as PlatformPreset]) {
      const preset = PLATFORM_PRESETS[platform as PlatformPreset];
      targetWidth = preset.width;
      targetHeight = preset.height;
      platformName = preset.name;
    } else if (customWidth && customHeight) {
      targetWidth = customWidth;
      targetHeight = customHeight;
      platformName = `Custom (${customWidth}x${customHeight})`;
    } else {
      return NextResponse.json(
        { error: 'Either platform or custom dimensions required' },
        { status: 400 }
      );
    }

    console.log(`[Image Resize] Resizing for ${platformName}: ${targetWidth}x${targetHeight}`);

    // Process the image
    const result = await resizeImageWithSharp(imageUrl, targetWidth, targetHeight);

    // Upload to Supabase storage
    const timestamp = Date.now();
    const extension = result.format === 'jpeg' ? 'jpg' : 'png';
    const contentType = result.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const fileName = `resized-${platform || 'custom'}-${timestamp}.${extension}`;
    const filePath = `resized/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, result.buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Image Resize] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload resized image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    console.log(`[Image Resize] Resized image uploaded: ${publicUrl}`);

    // Save to media library
    const mediaInput: CreateMediaItemInput = {
      type: 'image',
      source: 'edited',
      url: publicUrl,
      prompt: `Resized for ${platformName}`,
      model: 'image-resize',
      config: {
        sourceImage: imageUrl,
        platform: platform || 'custom',
        targetWidth,
        targetHeight,
        format: result.format,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        resizedAt: new Date().toISOString(),
      },
      metadata: {
        source: 'image-editor',
        platform: platformName,
        dimensions: `${targetWidth}x${targetHeight}`,
        width: targetWidth,
        height: targetHeight,
        format: result.format,
        fileSize: result.buffer.byteLength,
      },
      tags: ['resized', 'image-editor', platform || 'custom'],
    };

    const mediaItem = await MediaLibraryService.createMediaItem(
      mediaInput,
      user.id,
      workspaceId
    );

    console.log(`[Image Resize] Media item created: ${mediaItem.id}`);

    return NextResponse.json({
      success: true,
      mediaItem,
      url: publicUrl,
      platform: platformName,
      dimensions: { width: targetWidth, height: targetHeight },
      format: result.format,
      fileSize: result.buffer.byteLength,
    });
  } catch (error) {
    console.error('[Image Resize] Error:', error);

    // Parse error for user-friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Failed to resize image';
    let errorCode = 'RESIZE_ERROR';

    if (errorMessage.includes('Failed to download')) {
      userMessage = 'Could not download the image. Please check the URL is accessible.';
      errorCode = 'DOWNLOAD_FAILED';
    } else if (errorMessage.includes('Input file is missing') || errorMessage.includes('Input buffer')) {
      userMessage = 'The image file is invalid or corrupted.';
      errorCode = 'INVALID_IMAGE';
    } else if (errorMessage.includes('unsupported image format') || errorMessage.includes('Input file contains')) {
      userMessage = 'Unsupported image format. Please use JPEG, PNG, or WebP.';
      errorCode = 'UNSUPPORTED_FORMAT';
    } else if (errorMessage.includes('upload') || errorMessage.includes('storage')) {
      userMessage = 'Failed to save the resized image. Please try again.';
      errorCode = 'UPLOAD_ERROR';
    } else if (errorMessage.includes('dimensions') || errorMessage.includes('platform')) {
      userMessage = 'Invalid target dimensions. Please select a valid platform or size.';
      errorCode = 'INVALID_DIMENSIONS';
    }

    return NextResponse.json(
      {
        error: userMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

interface ResizeResult {
  buffer: Buffer;
  format: 'jpeg' | 'png';
  originalWidth: number;
  originalHeight: number;
}

/**
 * Resize image using Sharp with high quality settings
 * - Uses JPEG for photos (smaller file size)
 * - Uses PNG for images with transparency
 */
async function resizeImageWithSharp(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<ResizeResult> {
  const sharp = (await import('sharp')).default;

  console.log('[Image Resize] Downloading source image...');

  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[Image Resize] Downloaded: ${imageBuffer.byteLength} bytes`);

  // Get original image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  const hasAlpha = metadata.hasAlpha || false;

  console.log(`[Image Resize] Original: ${originalWidth}x${originalHeight}, alpha: ${hasAlpha}, format: ${metadata.format}`);

  // Decide output format: PNG for transparent images, JPEG for others
  const outputFormat: 'jpeg' | 'png' = hasAlpha ? 'png' : 'jpeg';

  console.log(`[Image Resize] Processing to ${targetWidth}x${targetHeight} as ${outputFormat}...`);

  // Create Sharp instance and resize
  let pipeline = sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: 'cover',        // Fill frame and crop excess (no black bars)
      position: 'center',  // Center the crop
    });

  // Apply format-specific quality settings
  let resizedBuffer: Buffer;
  if (outputFormat === 'jpeg') {
    resizedBuffer = await pipeline
      .jpeg({
        quality: 95,           // High quality (95 is excellent for web)
        mozjpeg: true,         // Use MozJPEG for better compression
        chromaSubsampling: '4:4:4', // No chroma subsampling for best quality
      })
      .toBuffer();
  } else {
    resizedBuffer = await pipeline
      .png({
        compressionLevel: 6,   // Balanced compression (0-9)
        adaptiveFiltering: true,
        palette: false,        // Don't reduce to palette (keeps quality)
      })
      .toBuffer();
  }

  console.log(`[Image Resize] Complete: ${resizedBuffer.byteLength} bytes (${outputFormat})`);

  return {
    buffer: resizedBuffer,
    format: outputFormat,
    originalWidth,
    originalHeight,
  };
}
