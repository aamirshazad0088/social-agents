/**
 * API Route: Audio Processing
 * Add music, mute, adjust volume for videos
 * Uses fluent-ffmpeg for robust server-side audio processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { MediaLibraryService, CreateMediaItemInput } from '@/services/database/mediaLibraryService';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Dynamically import fluent-ffmpeg and paths inside the function to improve Vercel bundling reliability
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      videoUrl,
      muteOriginal = false,
      backgroundMusicUrl,
      backgroundMusicName,
      originalVolume = 100,
      musicVolume = 80,
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
    }

    console.log(`[Audio Process] Request - Workspace: ${workspaceId}, Video: ${videoUrl}`);

    // Process the video with FFmpeg
    const processResult = await processVideoAudio({
      videoUrl,
      muteOriginal,
      backgroundMusicUrl,
      originalVolume,
      musicVolume,
    });

    // Upload processed video to Supabase storage
    const timestamp = Date.now();
    const fileName = `audio-remix-${timestamp}.mp4`;
    const filePath = `processed/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, processResult.buffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Audio Process] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload processed video' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    // Save to library
    const mediaInput: CreateMediaItemInput = {
      type: 'video',
      source: 'edited',
      url: publicUrl,
      prompt: `Audio Remix: ${backgroundMusicName || 'Custom Audio'}`,
      model: 'fluent-ffmpeg-processor',
      config: {
        sourceVideo: videoUrl,
        backgroundMusicUrl,
        muteOriginal,
        originalVolume,
        musicVolume,
        duration: processResult.duration,
      },
      metadata: {
        duration: processResult.duration,
        hasBackgroundMusic: !!backgroundMusicUrl,
        originalMuted: muteOriginal,
      },
      tags: ['edited', 'audio-remix'],
    };

    const mediaItem = await MediaLibraryService.createMediaItem(mediaInput, user.id, workspaceId);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaItem,
    });

  } catch (error) {
    console.error('[Audio Process] Major Error:', error);
    const message = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface AudioProcessingOptions {
  videoUrl: string;
  muteOriginal: boolean;
  backgroundMusicUrl?: string;
  originalVolume: number;
  musicVolume: number;
}

interface AudioProcessResult {
  buffer: Buffer;
  duration: number;
}

async function processVideoAudio(options: AudioProcessingOptions): Promise<AudioProcessResult> {
  // Use require for compatibility with Next.js/Vercel binary bundling
  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegPath = require('ffmpeg-static');
  const ffprobePath = require('ffprobe-static').path;

  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
  if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
  }

  const sessionId = randomUUID();
  const tempDir = join(tmpdir(), `remix-${sessionId}`);
  await mkdir(tempDir, { recursive: true });

  const inputVideoPath = join(tempDir, 'input_video.mp4');
  const inputAudioPath = join(tempDir, 'input_audio.mp3');
  const outputPath = join(tempDir, 'output.mp4');

  try {
    // 1. Download source files
    console.log('[Audio Process] Downloading files...');
    const [videoRes, audioRes] = await Promise.all([
      fetch(options.videoUrl),
      options.backgroundMusicUrl ? fetch(options.backgroundMusicUrl) : Promise.resolve(null)
    ]);

    if (!videoRes.ok) throw new Error('Video download failed');
    await writeFile(inputVideoPath, Buffer.from(await videoRes.arrayBuffer()));

    if (audioRes) {
      if (!audioRes.ok) throw new Error('Audio download failed');
      await writeFile(inputAudioPath, Buffer.from(await audioRes.arrayBuffer()));
    }

    // 2. Probing Video
    const probe = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputVideoPath, (err: any, metadata: any) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const videoHasAudio = probe.streams?.some((s: any) => s.codec_type === 'audio');
    const videoDuration = parseFloat(probe.format?.duration || '0');
    console.log(`[Audio Process] Video Info - Audio: ${videoHasAudio}, Duration: ${videoDuration}s`);

    // 3. Construct FFmpeg command
    const command = ffmpeg(inputVideoPath);

    const origVol = options.originalVolume / 100;
    const musicVol = options.musicVolume / 100;

    if (options.backgroundMusicUrl) {
      command.input(inputAudioPath).inputOptions(['-stream_loop', '-1']);

      let filterComplex = '';
      if (videoHasAudio && !options.muteOriginal) {
        filterComplex = `[0:a]volume=${origVol}[v_orig];[1:a]volume=${musicVol}[bg_music];[v_orig][bg_music]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
      } else {
        filterComplex = `[1:a]volume=${musicVol}[aout]`;
      }
      command.complexFilter([filterComplex], 'aout');
    } else {
      if (videoHasAudio && !options.muteOriginal) {
        command.audioFilters(`volume=${origVol}`);
      } else {
        command.input('anullsrc=channel_layout=stereo:sample_rate=44100').inputFormat('lavfi');
        command.complexFilter(['[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]'], 'aout');
      }
    }

    await new Promise<void>((resolve, reject) => {
      command
        .videoCodec('copy')
        .audioCodec('aac')
        .audioBitrate('192k')
        .outputOptions(['-shortest', '-movflags +faststart'])
        .on('start', (cmd: string) => console.log('[Audio Process] Command line:', cmd))
        .on('error', (err: any, stdout: any, stderr: any) => {
          console.error('[Audio Process] FFmpeg error:', err.message);
          console.error('[Audio Process] stderr:', stderr);
          reject(err);
        })
        .on('end', () => resolve())
        .save(outputPath);
    });

    const outputBuffer = await readFile(outputPath);
    return { buffer: outputBuffer, duration: videoDuration };

  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[Audio Process] Temp cleanup failed', e);
    }
  }
}
