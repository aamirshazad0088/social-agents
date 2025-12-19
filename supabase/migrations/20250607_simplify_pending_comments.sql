-- ============================================
-- SIMPLIFY PENDING COMMENTS TABLE
-- Migration to remove unused columns after workflow simplification
-- 
-- New workflow:
-- - Only store comments that need user reply (pending)
-- - Delete immediately after user replies or dismisses
-- - No need to track replied/dismissed status (API handles this)
-- ============================================

-- Remove columns that are no longer needed
-- These were used for tracking replied comments, but now we delete after reply
ALTER TABLE pending_comments 
  DROP COLUMN IF EXISTS user_reply,
  DROP COLUMN IF EXISTS replied_at,
  DROP COLUMN IF EXISTS reply_id;

-- Update status check constraint - only 'pending' is used now
-- But keep the constraint flexible in case we need other statuses later
ALTER TABLE pending_comments 
  DROP CONSTRAINT IF EXISTS pending_comments_status_check;

ALTER TABLE pending_comments 
  ADD CONSTRAINT pending_comments_status_check 
  CHECK (status IN ('pending'));

-- Drop the status index since all rows are 'pending' now
DROP INDEX IF EXISTS idx_pending_status;

-- Clean up any non-pending rows (they should have been deleted)
DELETE FROM pending_comments WHERE status != 'pending';

-- Add comment explaining the simplified workflow
COMMENT ON TABLE pending_comments IS 
  'Stores comments escalated by AI that need user reply. Rows are deleted after user replies or dismisses.';

COMMENT ON COLUMN pending_comments.status IS 
  'Always "pending" - rows are deleted when handled, not updated.';
