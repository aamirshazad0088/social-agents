-- ============================================================================
-- Migration: Add Audio Support to Media Library
-- Date: 2024-12-17
-- Description: Adds audio type for background music and audio file storage
-- ============================================================================

-- ============================================================================
-- 1. UPDATE media_library TYPE CONSTRAINT to include 'audio'
-- ============================================================================

-- Drop the existing type CHECK constraint if it exists
ALTER TABLE media_library DROP CONSTRAINT IF EXISTS media_library_type_check;

-- Add the updated CHECK constraint with 'audio' type included
ALTER TABLE media_library ADD CONSTRAINT media_library_type_check 
  CHECK (type::text = ANY (ARRAY[
    'image'::character varying,
    'video'::character varying,
    'audio'::character varying
  ]::text[]));

-- ============================================================================
-- 2. UPDATE storage bucket to accept audio MIME types
-- ============================================================================

-- Update the media bucket to include audio MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Image types
  'image/png', 
  'image/jpeg', 
  'image/jpg', 
  'image/gif', 
  'image/webp', 
  'image/svg+xml',
  -- Video types
  'video/mp4', 
  'video/webm', 
  'video/quicktime',
  -- Audio types (NEW)
  'audio/mpeg',      -- MP3
  'audio/mp3',       -- MP3 alternative
  'audio/wav',       -- WAV
  'audio/wave',      -- WAV alternative
  'audio/x-wav',     -- WAV alternative
  'audio/m4a',       -- M4A
  'audio/mp4',       -- M4A alternative (audio in mp4 container)
  'audio/x-m4a',     -- M4A alternative
  'audio/aac',       -- AAC
  'audio/ogg',       -- OGG
  'audio/flac'       -- FLAC
]
WHERE id = 'media';

-- ============================================================================
-- 3. CREATE INDEX for audio type filtering (optional but improves query speed)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_media_library_type 
  ON media_library (type);

-- ============================================================================
-- VERIFICATION: Run these queries to confirm the migration worked
-- ============================================================================
-- 
-- Check type constraint:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'media_library'::regclass AND contype = 'c' AND conname LIKE '%type%';
--
-- Check storage bucket MIME types:
-- SELECT id, allowed_mime_types FROM storage.buckets WHERE id = 'media';
--
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 017_add_audio_support completed successfully';
  RAISE NOTICE 'Audio type added to media_library table';
  RAISE NOTICE 'Audio MIME types added to media storage bucket';
END $$;
