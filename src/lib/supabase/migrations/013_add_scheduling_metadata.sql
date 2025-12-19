-- ============================================
-- Migration: Add Scheduling Metadata
-- Adds retry tracking and scheduling job logs
-- ============================================

-- Add retry columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS publish_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_publish_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS publish_error TEXT;

-- Create index for efficient scheduled post queries
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_pending 
ON posts(scheduled_at, status, publish_retry_count) 
WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Create scheduled_job_logs table for tracking cron executions
CREATE TABLE IF NOT EXISTS scheduled_job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL DEFAULT 'publish_scheduled',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed
    posts_processed INTEGER DEFAULT 0,
    posts_published INTEGER DEFAULT 0,
    posts_failed INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for job logs
CREATE INDEX IF NOT EXISTS idx_scheduled_job_logs_started 
ON scheduled_job_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_job_logs_status 
ON scheduled_job_logs(status);

-- Function to clean up old job logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM scheduled_job_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE scheduled_job_logs IS 'Tracks execution of scheduled publishing cron jobs';
COMMENT ON COLUMN posts.publish_retry_count IS 'Number of times publishing has been attempted for this post';
COMMENT ON COLUMN posts.last_publish_attempt IS 'Timestamp of the last publish attempt';
COMMENT ON COLUMN posts.publish_error IS 'Last error message from publishing attempt';
