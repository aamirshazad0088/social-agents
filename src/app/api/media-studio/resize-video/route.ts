/**
 * API Route: Video Resize
 * Resize videos for different social media platforms
 * Uses FFmpeg for server-side video processing
 * 
 * Features:
 * - High quality encoding (CRF 18, slow preset)
 * - 256k AAC audio
 * - Timeout handling for reliability
 * - Proper H.264 profile/level for compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MediaLibraryService, CreateMediaItemInput } from '@/services/database/mediaLibraryService';

// Platform aspect ratio presets - 2024 Official Standards
const PLATFORM_PRESETS = {
  // Vertical (9:16) - Short-form video platforms
  'youtube-short': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'YouTube Shorts', maxDuration: 60 },
  'instagram-reel': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Instagram Reels', maxDuration: 90 },
  'instagram-story': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Instagram Story', maxDuration: 60 },
  'tiktok': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'TikTok', maxDuration: 600 },
  'facebook-reel': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Facebook Reels', maxDuration: 90 },
  'twitter-portrait': { width: 1080, height: 1920, aspectRatio: '9:16', name: 'Twitter/X (Vertical)', maxDuration: 140 },

  // Square (1:1) - Feed posts
  'instagram-post': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Instagram Post (Square)', maxDuration: 60 },
  'facebook-post-square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'Facebook Post (Square)', maxDuration: 240 },
  'linkedin-square': { width: 1080, height: 1080, aspectRatio: '1:1', name: 'LinkedIn (Square)', maxDuration: 600 },

  // Portrait (4:5) - Optimized for mobile feed
  'instagram-feed': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Instagram Feed (4:5)', maxDuration: 60 },
  'facebook-feed': { width: 1080, height: 1350, aspectRatio: '4:5', name: 'Facebook Feed (4:5)', maxDuration: 240 },

  // Landscape (16:9) - Traditional video
  'youtube': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'YouTube (1080p)', maxDuration: null },
  'facebook-post': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'Facebook (16:9)', maxDuration: 240 },
  'twitter': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'Twitter/X (16:9)', maxDuration: 140 },
  'linkedin': { width: 1920, height: 1080, aspectRatio: '16:9', name: 'LinkedIn (16:9)', maxDuration: 600 },
};

export type PlatformPreset = keyof typeof PLATFORM_PRESETS;

/**
 * GET /api/media-studio/resize-video
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
 * POST /api/media-studio/resize-video
 * Resize video for a specific platform
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
    const { workspaceId, videoUrl, platform, customWidth, customHeight } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
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

    console.log(`[Video Resize] Resizing for ${platformName}: ${targetWidth}x${targetHeight}`);

    // Process the video
    const result = await resizeVideoWithFFmpeg(videoUrl, targetWidth, targetHeight);

    // Upload to Supabase storage
    const timestamp = Date.now();
    const fileName = `resized-${platform || 'custom'}-${timestamp}.mp4`;
    const filePath = `resized/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, result.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Video Resize] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload resized video' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    console.log(`[Video Resize] Resized video uploaded: ${publicUrl}`);

    // Save to media library
    const mediaInput: CreateMediaItemInput = {
      type: 'video',
      source: 'edited',
      url: publicUrl,
      prompt: `Resized for ${platformName}`,
      model: 'video-resize',
      config: {
        sourceVideo: videoUrl,
        platform: platform || 'custom',
        targetWidth,
        targetHeight,
        duration: result.duration,
        resizedAt: new Date().toISOString(),
      },
      metadata: {
        source: 'video-editor',
        platform: platformName,
        dimensions: `${targetWidth}x${targetHeight}`,
        width: targetWidth,
        height: targetHeight,
        duration: result.duration,
      },
      tags: ['resized', 'video-editor', platform || 'custom'],
    };

    const mediaItem = await MediaLibraryService.createMediaItem(
      mediaInput,
      user.id,
      workspaceId
    );

    console.log(`[Video Resize] Media item created: ${mediaItem.id}`);

    return NextResponse.json({
      success: true,
      mediaItem,
      url: publicUrl,
      platform: platformName,
      dimensions: { width: targetWidth, height: targetHeight },
      duration: result.duration,
    });
  } catch (error) {
    console.error('[Video Resize] Error:', error);

    // Parse error for user-friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Failed to resize video';
    let errorCode = 'RESIZE_ERROR';

    if (errorMessage.includes('timed out')) {
      userMessage = 'Video processing timed out. Try with a shorter video.';
      errorCode = 'TIMEOUT';
    } else if (errorMessage.includes('Failed to download')) {
      userMessage = 'Could not download the video. Please check the URL is accessible.';
      errorCode = 'DOWNLOAD_FAILED';
    } else if (errorMessage.includes('FFmpeg')) {
      userMessage = 'Video processing failed. The file may be corrupted or in an unsupported format.';
      errorCode = 'PROCESSING_ERROR';
    } else if (errorMessage.includes('upload') || errorMessage.includes('storage')) {
      userMessage = 'Failed to save the resized video. Please try again.';
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
  duration: number;
}

/**
 * Get video duration using FFprobe
 */
async function getVideoDuration(filePath: string, ffprobePath: string): Promise<number> {
  const { spawn } = await import('child_process');

  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath,
    ]);

    let stdout = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(0);
        return;
      }
      try {
        const data = JSON.parse(stdout);
        resolve(parseFloat(data.format?.duration || '0'));
      } catch {
        resolve(0);
      }
    });
  });
}

/**
 * Resize video using FFmpeg with high quality settings
 */
async function resizeVideoWithFFmpeg(
  videoUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<ResizeResult> {
  const { writeFile, unlink, readFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { spawn } = await import('child_process');
  const { randomUUID } = await import('crypto');

  const ffmpegPath = require('ffmpeg-static') as string;
  const ffprobePath = require('ffprobe-static').path as string;

  if (!ffmpegPath) {
    throw new Error('FFmpeg binary not found.');
  }

  const tempDir = join(tmpdir(), `video-resize-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const inputPath = join(tempDir, 'input.mp4');
  const outputPath = join(tempDir, 'output.mp4');

  // Helper to run FFmpeg with timeout
  const runFFmpeg = (args: string[], timeoutMs = 300000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('FFmpeg operation timed out'));
      }, timeoutMs);

      proc.stderr?.on('data', (d) => { stderr += d.toString(); });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`FFmpeg error: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed: ${stderr.slice(-500)}`));
      });
    });
  };

  try {
    // Download video
    console.log('[Video Resize] Downloading source video...');
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error('Failed to download video');
    }
    await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));

    // Get input duration
    const inputDuration = await getVideoDuration(inputPath, ffprobePath);
    console.log(`[Video Resize] Input duration: ${inputDuration.toFixed(1)}s`);

    // High quality video filter - scale and crop to fill frame (no black bars)
    const videoFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},setsar=1,format=yuv420p`;

    // Try resize with audio first
    console.log(`[Video Resize] Processing to ${targetWidth}x${targetHeight}...`);
    try {
      await runFFmpeg([
        '-y',
        '-threads', '0',
        '-i', inputPath,
        '-vf', videoFilter,
        '-c:v', 'libx264',
        '-preset', 'medium',      // Better quality than ultrafast
        '-crf', '18',              // High quality (18-20 is visually lossless)
        '-profile:v', 'high',      // H.264 High Profile for better compression
        '-level', '4.1',           // Level 4.1 for wide compatibility
        '-c:a', 'aac',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '256k',            // High quality audio
        '-movflags', '+faststart', // Enable fast web playback
        outputPath,
      ]);
    } catch {
      // Video has no audio - add silent audio track
      console.log('[Video Resize] No audio detected, adding silent track...');
      await runFFmpeg([
        '-y',
        '-threads', '0',
        '-i', inputPath,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-vf', videoFilter,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-profile:v', 'high',
        '-level', '4.1',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', '+faststart',
        '-shortest',
        outputPath,
      ]);
    }

    console.log('[Video Resize] Reading output...');
    const outputBuffer = await readFile(outputPath);

    console.log(`[Video Resize] Complete: ${outputBuffer.byteLength} bytes`);

    return {
      buffer: outputBuffer,
      duration: inputDuration,
    };

  } finally {
    // Cleanup
    console.log('[Video Resize] Cleaning up...');
    await unlink(inputPath).catch(() => { });
    await unlink(outputPath).catch(() => { });
    const { rmdir } = await import('fs/promises');
    await rmdir(tempDir).catch(() => { });
  }
}
