-- ============================================================================
-- Migration: Add Google Veo 3.1 source types to media_library
-- Date: 2024-11-30
-- Description: Adds Veo video generation source types for Google Veo 3.1 integration
-- ============================================================================

-- Drop the existing CHECK constraint
ALTER TABLE media_library DROP CONSTRAINT IF EXISTS media_library_source_check;

-- Add the updated CHECK constraint with Veo sources included
ALTER TABLE media_library ADD CONSTRAINT media_library_source_check 
  CHECK (source::text = ANY (ARRAY[
    -- Existing sources
    'generated'::character varying,      -- Text-to-image or text-to-video (Sora)
    'edited'::character varying,         -- Smart edit or Canva edited
    'variation'::character varying,      -- DALL-E 2 variations
    'reference'::character varying,      -- Style reference generation
    'image-to-video'::character varying, -- Image animated to video (Sora)
    'remix'::character varying,          -- Video remix (Sora)
    'uploaded'::character varying,       -- User uploaded media
    'inpaint'::character varying,        -- Inpainting edit
    -- Google Veo 3.1 sources
    'veo-text'::character varying,           -- Veo text-to-video
    'veo-image'::character varying,          -- Veo image-to-video (first frame)
    'veo-extend'::character varying,         -- Veo video extension (+7s)
    'veo-frame-specific'::character varying, -- Veo first+last frame transition
    'veo-reference'::character varying       -- Veo reference images (1-3)
  ]::text[]));

-- ============================================================================
-- IMPORTANT: The config JSONB column already exists and will store Veo metadata
-- 
-- For Veo videos, the config column should contain:
-- {
--   "model": "veo-3.1-generate-preview" | "veo-3.1-fast-generate-preview",
--   "prompt": "...",
--   "aspectRatio": "16:9" | "9:16",
--   "duration": 4 | 6 | 8,
--   "resolution": "720p" | "1080p",
--   "veo_video_id": "...",        -- REQUIRED for video extension feature
--   "veo_operation_id": "...",    -- Operation ID for reference
--   "extension_count": 0-20,      -- Number of times extended
--   "parent_video_id": "...",     -- If extended, link to parent
--   "is_extendable": true/false,  -- true if count < 20
--   "total_duration": number,     -- Cumulative seconds
--   "generation_mode": "text" | "image" | "extend" | "frame-specific" | "reference",
--   "input_image_url": "...",     -- For image-to-video
--   "first_frame_url": "...",     -- For frame-specific
--   "last_frame_url": "...",      -- For frame-specific
--   "reference_image_urls": [...] -- For reference images (1-3)
-- }
-- ============================================================================

-- ============================================================================
-- VERIFICATION: Run this query to confirm the constraint was updated
-- ============================================================================
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'media_library'::regclass AND contype = 'c';

-- ============================================================================
-- Optional: Create an index on config->>'veo_video_id' for faster lookups
-- when extending videos (finding extendable Veo videos)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_media_library_veo_video_id 
  ON media_library ((config->>'veo_video_id')) 
  WHERE config->>'veo_video_id' IS NOT NULL;

-- Create index on source for filtering by Veo sources
CREATE INDEX IF NOT EXISTS idx_media_library_source 
  ON media_library (source);

