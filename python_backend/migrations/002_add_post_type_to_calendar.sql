-- Migration: Add post_type column to content_calendar_entries
-- Created: 2026-01-15
-- Description: Adds platform-specific post type field to calendar entries

-- =============================================================================
-- POST TYPES BY PLATFORM (Reference):
-- instagram: post, reel, story, carousel, live
-- twitter: text, image, video, thread, poll  
-- linkedin: post, article, carousel, document, poll
-- youtube: video, short, premiere, live
-- tiktok: video, duet, stitch, live
-- facebook: post, reel, story, event, live
-- pinterest: pin, idea_pin, video_pin
-- =============================================================================

BEGIN;

-- Step 1: Add post_type column (nullable first for existing rows)
ALTER TABLE content_calendar_entries 
ADD COLUMN IF NOT EXISTS post_type TEXT;

-- Step 2: Set default value for existing rows based on platform
UPDATE content_calendar_entries 
SET post_type = CASE 
    WHEN platform = 'instagram' THEN 'post'
    WHEN platform = 'twitter' THEN 'text'
    WHEN platform = 'linkedin' THEN 'post'
    WHEN platform = 'youtube' THEN 'video'
    WHEN platform = 'tiktok' THEN 'video'
    WHEN platform = 'facebook' THEN 'post'
    WHEN platform = 'pinterest' THEN 'pin'
    ELSE 'post'
END
WHERE post_type IS NULL;

-- Step 3: Set default for new rows
ALTER TABLE content_calendar_entries 
ALTER COLUMN post_type SET DEFAULT 'post';

-- Step 4: Add platform constraint for pinterest if needed
-- (Dropping and recreating platform check constraint to include pinterest)
ALTER TABLE content_calendar_entries 
DROP CONSTRAINT IF EXISTS content_calendar_entries_platform_check;

ALTER TABLE content_calendar_entries 
ADD CONSTRAINT content_calendar_entries_platform_check 
CHECK (platform IN ('instagram', 'linkedin', 'twitter', 'tiktok', 'youtube', 'facebook', 'pinterest'));

-- Step 5: Create index for filtering by post_type
CREATE INDEX IF NOT EXISTS idx_calendar_entries_post_type 
ON content_calendar_entries(workspace_id, post_type);

-- Step 6: Verify migration
SELECT 
    COUNT(*) as total_entries,
    COUNT(post_type) as entries_with_post_type,
    COUNT(*) - COUNT(post_type) as entries_missing_post_type
FROM content_calendar_entries;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERY (Run after migration to verify):
-- SELECT platform, post_type, COUNT(*) 
-- FROM content_calendar_entries 
-- GROUP BY platform, post_type 
-- ORDER BY platform, post_type;
-- =============================================================================
