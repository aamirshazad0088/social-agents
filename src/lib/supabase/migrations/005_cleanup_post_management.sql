-- =============================================
-- Migration 005: Clean up post management workflow
-- Removes: approvals, campaigns, A/B tests
-- Updates: post status default to 'ready_to_publish'
-- =============================================

-- Step 1: Update any existing 'draft' posts to 'ready_to_publish'
UPDATE public.posts 
SET status = 'ready_to_publish' 
WHERE status = 'draft';

-- Step 2: Update any 'needs_approval' or 'approved' posts to 'ready_to_publish'
UPDATE public.posts 
SET status = 'ready_to_publish' 
WHERE status IN ('needs_approval', 'approved');

-- Step 3: Remove campaign_id from posts (if exists)
ALTER TABLE public.posts DROP COLUMN IF EXISTS campaign_id;

-- Step 4: Drop dependent tables first (order matters due to foreign keys)
DROP TABLE IF EXISTS public.a_b_test_variants CASCADE;
DROP TABLE IF EXISTS public.a_b_tests CASCADE;
DROP TABLE IF EXISTS public.campaign_analytics CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- Step 5: Drop related indexes (if they exist)
DROP INDEX IF EXISTS idx_posts_campaign;
DROP INDEX IF EXISTS idx_approvals_post;
DROP INDEX IF EXISTS idx_approvals_workspace;
DROP INDEX IF EXISTS idx_approvals_status;
DROP INDEX IF EXISTS idx_approvals_created_at;
DROP INDEX IF EXISTS idx_campaigns_workspace;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaigns_created_at;
DROP INDEX IF EXISTS idx_campaigns_workspace_status;
DROP INDEX IF EXISTS idx_a_b_tests_workspace_id;
DROP INDEX IF EXISTS idx_a_b_tests_campaign_id;
DROP INDEX IF EXISTS idx_a_b_tests_status;
DROP INDEX IF EXISTS idx_a_b_test_variants_test_id;
DROP INDEX IF EXISTS idx_a_b_test_variants_post_id;
DROP INDEX IF EXISTS idx_campaign_analytics_campaign_id;
DROP INDEX IF EXISTS idx_campaign_analytics_metric_date;
DROP INDEX IF EXISTS idx_campaign_analytics_workspace_id;

-- Step 6: Drop related triggers
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS update_approvals_updated_at ON public.approvals;
DROP TRIGGER IF EXISTS update_a_b_tests_updated_at ON public.a_b_tests;
DROP TRIGGER IF EXISTS update_campaign_analytics_updated_at ON public.campaign_analytics;

-- Step 7: Recreate the post_status enum with only the needed values
-- First, create a new enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status_new') THEN
        CREATE TYPE post_status_new AS ENUM ('ready_to_publish', 'scheduled', 'published', 'failed');
    END IF;
END $$;

-- Step 8: Update the posts table to use the new enum
ALTER TABLE public.posts 
  ALTER COLUMN status DROP DEFAULT;
  
ALTER TABLE public.posts
  ALTER COLUMN status TYPE post_status_new USING status::text::post_status_new;
  
ALTER TABLE public.posts
  ALTER COLUMN status SET DEFAULT 'ready_to_publish'::post_status_new;

-- Step 9: Drop the old enum and rename the new one
DROP TYPE IF EXISTS post_status;
ALTER TYPE post_status_new RENAME TO post_status;

-- Step 10: Drop the approval_status enum (no longer needed)
DROP TYPE IF EXISTS approval_status CASCADE;

-- =============================================
-- DONE: Schema is now cleaned up
-- Removed tables: approvals, campaigns, a_b_tests, a_b_test_variants, campaign_analytics
-- Removed enums: approval_status
-- Updated post_status enum: ready_to_publish, scheduled, published, failed
-- =============================================

