/**
 * API Route: Video Merge
 * Merges multiple videos into a single video file
 * Uses FFmpeg for server-side video processing
 * 
 * Features:
 * - Audio normalization (loudnorm) for consistent volume
 * - Auto-detection of vertical "Shorts" content (9:16)
 * - Server-side duration verification (5-min max)
 * - High quality encoding with CRF 18
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MediaLibraryService, CreateMediaItemInput } from '@/services/database/mediaLibraryService';

interface MergeConfig {
  resolution?: 'original' | '720p' | '1080p';
  quality?: 'draft' | 'high';
}

interface VideoProbeResult {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

const MAX_TOTAL_DURATION_SECONDS = 300; // 5 minutes

/**
 * POST /api/media-studio/merge-videos
 * Merge multiple videos into one
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
    const { workspaceId, videoUrls, title, config } = body;
    const mergeConfig: MergeConfig = config || { resolution: '720p', quality: 'draft' };

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 video URLs are required for merging' },
        { status: 400 }
      );
    }

    // Validate all URLs are accessible - basic check
    for (const url of videoUrls) {
      if (!url || typeof url !== 'string') {
        return NextResponse.json(
          { error: 'Invalid video URL provided' },
          { status: 400 }
        );
      }
    }

    console.log(`[Video Merge] Starting merge of ${videoUrls.length} videos for workspace ${workspaceId} with config:`, mergeConfig);

    // Download all videos and merge them using FFmpeg
    // We pass the config to control quality/speed trade-off
    const mergeResult = await mergeVideosWithFFmpeg(videoUrls, mergeConfig);

    // Upload merged video to Supabase storage
    const timestamp = Date.now();
    const fileName = `merged-video-${timestamp}.mp4`;
    const filePath = `merged/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, mergeResult.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Video Merge] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload merged video' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    console.log(`[Video Merge] Merged video uploaded: ${publicUrl}`);

    // Save to media library
    const mediaInput: CreateMediaItemInput = {
      type: 'video',
      source: 'edited',
      url: publicUrl,
      prompt: title || `Merged video (${videoUrls.length} clips)`,
      model: 'video-merge',
      config: {
        sourceVideos: videoUrls,
        mergedAt: new Date().toISOString(),
        videoCount: videoUrls.length,
        resolution: `${mergeResult.outputWidth}x${mergeResult.outputHeight}`,
        quality: mergeConfig.quality,
        isVertical: mergeResult.isVertical,
        totalDuration: mergeResult.totalDuration,
        outputWidth: mergeResult.outputWidth,
        outputHeight: mergeResult.outputHeight,
      },
      metadata: {
        source: 'video-editor',
        mergedAt: new Date().toISOString(),
        clipCount: videoUrls.length,
        resolution: `${mergeResult.outputWidth}x${mergeResult.outputHeight}`,
        width: mergeResult.outputWidth,
        height: mergeResult.outputHeight,
        quality: mergeConfig.quality,
        isVertical: mergeResult.isVertical,
        duration: mergeResult.totalDuration,
        audioNormalized: true,
      },
      tags: ['merged', 'video-editor', 'edited', ...(mergeResult.isVertical ? ['shorts', 'vertical'] : [])],
    };

    const mediaItem = await MediaLibraryService.createMediaItem(
      mediaInput,
      user.id,
      workspaceId
    );

    console.log(`[Video Merge] Media item created: ${mediaItem.id}`);

    return NextResponse.json({
      success: true,
      mediaItem,
      url: publicUrl,
      clipCount: videoUrls.length,
      totalDuration: mergeResult.totalDuration,
      isVertical: mergeResult.isVertical,
    });
  } catch (error) {
    console.error('[Video Merge] Error:', error);

    // Parse error for user-friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Failed to merge videos';
    let errorCode = 'MERGE_ERROR';

    if (errorMessage.includes('timed out')) {
      userMessage = 'Video processing timed out. Try using fewer clips or shorter videos.';
      errorCode = 'TIMEOUT';
    } else if (errorMessage.includes('Failed to download')) {
      userMessage = 'Could not download one of your videos. Please check the video URLs are accessible.';
      errorCode = 'DOWNLOAD_FAILED';
    } else if (errorMessage.includes('5-minute limit') || errorMessage.includes('duration')) {
      userMessage = errorMessage; // Already user-friendly
      errorCode = 'DURATION_LIMIT';
    } else if (errorMessage.includes('FFmpeg')) {
      userMessage = 'Video processing failed. One of your clips may be corrupted or in an unsupported format.';
      errorCode = 'PROCESSING_ERROR';
    } else if (errorMessage.includes('upload') || errorMessage.includes('storage')) {
      userMessage = 'Failed to save the merged video. Please try again.';
      errorCode = 'UPLOAD_ERROR';
    } else if (errorMessage.includes('empty')) {
      userMessage = 'One of the video files is empty or invalid.';
      errorCode = 'INVALID_FILE';
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

interface MergeResult {
  buffer: Buffer;
  totalDuration: number;
  isVertical: boolean;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Probe video file to get duration and dimensions using FFprobe
 */
async function probeVideoFile(filePath: string, ffprobePath: string): Promise<VideoProbeResult> {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      reject(new Error(`FFprobe error: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
        const duration = parseFloat(data.format?.duration || videoStream?.duration || '0');

        resolve({
          duration,
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
          hasAudio: !!audioStream,
        });
      } catch (e) {
        reject(new Error(`Failed to parse FFprobe output: ${e}`));
      }
    });
  });
}

/**
 * Merge videos using FFmpeg
 * Downloads videos, normalizes them with loudnorm, and concatenates reliably
 * Auto-detects vertical (Shorts) content and preserves aspect ratio
 */
async function mergeVideosWithFFmpeg(videoUrls: string[], config: MergeConfig): Promise<MergeResult> {
  const { writeFile, unlink, readFile, mkdir, rmdir } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { spawn } = await import('child_process');
  const { randomUUID } = await import('crypto');

  const ffmpegPath = require('ffmpeg-static') as string;
  const ffprobePath = require('ffprobe-static').path as string;

  if (!ffmpegPath) {
    throw new Error('FFmpeg binary not found.');
  }

  const tempDir = join(tmpdir(), `video-merge-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const downloadedFiles: string[] = [];
  const normalizedFiles: string[] = [];
  const concatListPath = join(tempDir, 'concat.txt');
  const outputPath = join(tempDir, 'output.mp4');

  // Determine FFmpeg settings based on config
  // IMPROVED: CRF 18 for high quality (better than 23), CRF 24 for draft (faster)
  const isHighQuality = config.quality === 'high';
  const preset = isHighQuality ? 'slow' : 'fast';
  const crf = isHighQuality ? '18' : '24';
  const audioBitrate = isHighQuality ? '256k' : '128k';

  // Helper to run FFmpeg with timeout and better error logging
  const runFFmpeg = (args: string[], timeoutMs = 300000): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 5 minute timeout per operation (increased for high quality encoding)
      const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('FFmpeg operation timed out'));
      }, timeoutMs);

      proc.stderr?.on('data', (d) => { stderr += d.toString(); });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`FFmpeg processing error: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else {
          console.error(`FFmpeg failed with code ${code}. Stderr: ${stderr.slice(-800)}`);
          reject(new Error(`FFmpeg failed (code ${code}). See logs for details.`));
        }
      });
    });
  };

  try {
    // 1. Download all videos with error handling
    console.log(`[FFmpeg] Downloading ${videoUrls.length} videos...`);
    for (let i = 0; i < videoUrls.length; i++) {
      const tempPath = join(tempDir, `input-${i}.mp4`);
      try {
        const response = await fetch(videoUrls[i]);
        if (!response.ok) {
          throw new Error(`Failed to download video ${i + 1} (Status: ${response.status})`);
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength === 0) throw new Error(`Video ${i + 1} is empty`);
        await writeFile(tempPath, Buffer.from(buffer));
        downloadedFiles.push(tempPath);
      } catch (e: any) {
        throw new Error(`Download failed for video ${i + 1}: ${e.message}`);
      }
    }

    // 2. Probe all videos to get duration and detect orientation
    console.log(`[FFmpeg] Probing ${downloadedFiles.length} videos for duration and orientation...`);
    const probeResults: VideoProbeResult[] = [];
    let totalDuration = 0;
    let verticalCount = 0;
    let horizontalCount = 0;

    for (let i = 0; i < downloadedFiles.length; i++) {
      try {
        const probe = await probeVideoFile(downloadedFiles[i], ffprobePath);
        probeResults.push(probe);
        totalDuration += probe.duration;

        // Detect vertical (Shorts) content: height > width
        if (probe.height > probe.width) {
          verticalCount++;
        } else {
          horizontalCount++;
        }

        console.log(`[FFmpeg] Video ${i + 1}: ${probe.width}x${probe.height}, ${probe.duration.toFixed(1)}s, audio: ${probe.hasAudio}`);
      } catch (e: any) {
        console.warn(`[FFmpeg] Probe failed for video ${i + 1}, using defaults: ${e.message}`);
        probeResults.push({ duration: 0, width: 1920, height: 1080, hasAudio: true });
      }
    }

    // 3. Server-side duration limit check
    console.log(`[FFmpeg] Total duration: ${totalDuration.toFixed(1)}s (max: ${MAX_TOTAL_DURATION_SECONDS}s)`);
    if (totalDuration > MAX_TOTAL_DURATION_SECONDS) {
      throw new Error(`Total duration (${Math.ceil(totalDuration)}s) exceeds the 5-minute limit. Please remove some clips.`);
    }

    // 4. Determine output orientation (majority wins, default to horizontal)
    const isVertical = verticalCount > horizontalCount;
    console.log(`[FFmpeg] Output orientation: ${isVertical ? 'Vertical (9:16 Shorts)' : 'Horizontal (16:9)'}`);

    // 5. Use FIRST video's dimensions as master resolution (preserves original size)
    // This ensures output quality matches the input
    const firstProbe = probeResults[0];
    let outputWidth = firstProbe.width;
    let outputHeight = firstProbe.height;

    // Resolution handling:
    // - 'original' or undefined: Keep first video's dimensions (default)
    // - '720p': Downscale to 720p if source is larger (for smaller file size)
    // - '1080p': Use 1080p if source is larger, otherwise keep original (no upscaling)
    if (config.resolution === '720p') {
      // Downscale to 720p for smaller file size
      if (outputWidth > 1280 || outputHeight > 720) {
        if (isVertical) {
          outputWidth = 720;
          outputHeight = 1280;
        } else {
          outputWidth = 1280;
          outputHeight = 720;
        }
        console.log(`[FFmpeg] Downscaling to ${outputWidth}x${outputHeight} (720p compact mode)`);
      } else {
        console.log(`[FFmpeg] Source is already ≤720p, keeping: ${outputWidth}x${outputHeight}`);
      }
    } else if (config.resolution === '1080p') {
      // Force 1080p only if source is larger (don't upscale)
      if (outputWidth > 1920 || outputHeight > 1080) {
        if (isVertical) {
          outputWidth = 1080;
          outputHeight = 1920;
        } else {
          outputWidth = 1920;
          outputHeight = 1080;
        }
        console.log(`[FFmpeg] Capping to ${outputWidth}x${outputHeight} (1080p max)`);
      } else {
        console.log(`[FFmpeg] Source is ≤1080p, preserving: ${outputWidth}x${outputHeight}`);
      }
    } else {
      // 'original' or undefined - preserve first video's exact dimensions
      console.log(`[FFmpeg] Preserving original resolution: ${outputWidth}x${outputHeight}`);
    }

    // Scale filter that maintains aspect ratio and pads if needed
    const resolutionFilter = `scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;

    // 6. Normalize each video with loudnorm audio normalization
    console.log(`[FFmpeg] Normalizing videos to ${outputWidth}x${outputHeight}, ${config.quality} quality with audio normalization...`);

    for (let i = 0; i < downloadedFiles.length; i++) {
      const inputPath = downloadedFiles[i];
      const normalizedPath = join(tempDir, `normalized-${i}.mp4`);
      const probe = probeResults[i];

      // Base arguments
      const baseArgs = [
        '-y',
        '-threads', '0',
        '-i', inputPath,
      ];

      // Video filter with resolution normalization
      const videoFilter = `${resolutionFilter},fps=30,format=yuv420p`;

      // Audio filter with loudnorm for consistent volume across clips
      // Using loudnorm with standard broadcast settings (I=-16, TP=-1.5, LRA=11)
      const audioFilter = `aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11`;

      // Try with audio + loudnorm first
      if (probe.hasAudio) {
        try {
          await runFFmpeg([
            ...baseArgs,
            '-filter_complex',
            `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', crf,
            '-profile:v', 'high',
            '-level', '4.1',
            '-c:a', 'aac',
            '-b:a', audioBitrate,
            '-ar', '44100',
            '-ac', '2',
            '-movflags', '+faststart',
            normalizedPath,
          ]);
          normalizedFiles.push(normalizedPath);
          continue;
        } catch (err) {
          console.warn(`[FFmpeg] Normalization with audio failed for video ${i + 1}, trying silent fallback...`);
        }
      }

      // Fallback: Add silent audio if audio stream missing or corrupt
      console.log(`[FFmpeg] Adding silent audio to video ${i + 1}...`);
      await runFFmpeg([
        ...baseArgs,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex',
        `[0:v]${videoFilter}[v]`,
        '-map', '[v]',
        '-map', '1:a',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf,
        '-profile:v', 'high',
        '-level', '4.1',
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-ar', '44100',
        '-ac', '2',
        '-shortest',
        '-movflags', '+faststart',
        normalizedPath,
      ]);

      normalizedFiles.push(normalizedPath);
    }

    // 6. Create concat list
    console.log('[FFmpeg] Concatenating normalized videos...');
    const concatContent = normalizedFiles
      .map(f => `file '${f.replace(/\\/g, '/')}'`)
      .join('\n');
    await writeFile(concatListPath, concatContent);

    // 7. Concat all normalized videos (stream copy is safe since all are normalized)
    await runFFmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ]);

    // 8. Read output
    console.log('[FFmpeg] Reading merged output...');
    const outputBuffer = await readFile(outputPath);

    console.log(`[FFmpeg] Merge complete: ${outputBuffer.byteLength} bytes, ${totalDuration.toFixed(1)}s total`);

    return {
      buffer: outputBuffer,
      totalDuration: Math.round(totalDuration),
      isVertical,
      outputWidth,
      outputHeight,
    };

  } catch (error) {
    console.error('[FFmpeg Process Error]', error);
    throw error; // Re-throw to be handled by the route
  } finally {
    // Robust Cleanup
    try {
      const allFiles = [...downloadedFiles, ...normalizedFiles, concatListPath, outputPath];
      await Promise.allSettled(allFiles.map(f => unlink(f).catch(() => { })));
      await rmdir(tempDir).catch(() => { });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}
