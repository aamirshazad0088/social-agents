-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Migration for improved query performance
-- Created: 2025-06-09
-- ============================================

-- ============================================
-- 1. SOCIAL ACCOUNTS INDEXES
-- Frequently queried by workspace_id + platform
-- ============================================

-- Composite index for workspace + platform lookups (if not exists)
-- This is the most common query pattern for credential lookups
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace_platform 
  ON social_accounts(workspace_id, platform);

-- Index for connected accounts filtering
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace_connected 
  ON social_accounts(workspace_id, is_connected) 
  WHERE is_connected = true;

-- ============================================
-- 2. POSTS INDEXES
-- Cron job queries: status + scheduled_at + deleted_at
-- ============================================

-- Composite index for scheduled post cron queries
-- Matches: .eq('status', 'scheduled').lte('scheduled_at', now).is('deleted_at', null)
CREATE INDEX IF NOT EXISTS idx_posts_cron_scheduled 
  ON posts(status, scheduled_at, deleted_at) 
  WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Index for posts with retry count (cron job filtering)
CREATE INDEX IF NOT EXISTS idx_posts_publish_retry 
  ON posts(status, publish_retry_count) 
  WHERE status = 'scheduled';

-- Composite index for workspace + status + scheduled queries
CREATE INDEX IF NOT EXISTS idx_posts_workspace_status_scheduled 
  ON posts(workspace_id, status, scheduled_at DESC);

-- ============================================
-- 3. USERS INDEXES
-- Role-based queries within workspace
-- ============================================

-- Composite index for workspace + role queries
CREATE INDEX IF NOT EXISTS idx_users_workspace_role 
  ON users(workspace_id, role);

-- Index for active users in workspace
CREATE INDEX IF NOT EXISTS idx_users_workspace_active 
  ON users(workspace_id, is_active) 
  WHERE is_active = true;

-- ============================================
-- 4. ACTIVITY LOGS INDEXES
-- Audit queries by workspace + created_at
-- ============================================

-- Composite index for workspace activity with date range
-- Already exists as idx_activity_logs_workspace_date but adding action filter
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_action_date 
  ON activity_logs(workspace_id, action, created_at DESC);

-- Index for user activity within workspace
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_user_date 
  ON activity_logs(workspace_id, user_id, created_at DESC);

-- ============================================
-- 5. PENDING COMMENTS INDEXES (Comment Agent)
-- Frequently queried for pending status
-- ============================================

-- Composite index for pending comments by workspace and status
CREATE INDEX IF NOT EXISTS idx_pending_comments_workspace_status_created 
  ON pending_comments(workspace_id, status, created_at DESC) 
  WHERE status = 'pending';

-- ============================================
-- 6. COMPANY KNOWLEDGE INDEXES
-- Knowledge base lookups
-- ============================================

-- Index for active knowledge by workspace and category
CREATE INDEX IF NOT EXISTS idx_knowledge_workspace_category_active 
  ON company_knowledge(workspace_id, category, is_active) 
  WHERE is_active = true;

-- ============================================
-- 7. POST ANALYTICS INDEXES
-- Analytics queries by workspace and date
-- ============================================

-- Composite index for workspace analytics with platform filter
CREATE INDEX IF NOT EXISTS idx_analytics_workspace_platform_date 
  ON post_analytics(workspace_id, platform, fetched_at DESC);

-- ============================================
-- 8. OAUTH STATES INDEXES
-- Security: Quick lookup and cleanup
-- ============================================

-- Index for expired state cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_cleanup 
  ON oauth_states(expires_at, is_used) 
  WHERE is_used = false;

-- ============================================
-- 9. WORKSPACE INVITES INDEXES
-- Invite lookup and validation
-- ============================================

-- Index for pending invites by workspace
CREATE INDEX IF NOT EXISTS idx_workspace_invites_pending 
  ON workspace_invites(workspace_id, is_accepted, expires_at) 
  WHERE is_accepted = false;

-- ============================================
-- ANALYZE TABLES
-- Update statistics for query planner
-- ============================================

ANALYZE social_accounts;
ANALYZE posts;
ANALYZE users;
ANALYZE activity_logs;
ANALYZE pending_comments;
ANALYZE company_knowledge;
ANALYZE post_analytics;
ANALYZE oauth_states;
ANALYZE workspace_invites;
