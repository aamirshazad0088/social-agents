-- ============================================
-- Migration: Create Meta Ads Tables
-- Description: Adds tables for Meta Ads management
-- Date: 2025-01-XX
-- ============================================

-- Add 'meta_ads' to platform_type enum
-- Note: If enum modification fails, we'll use 'facebook' platform with meta_ads metadata
DO $$ 
BEGIN
  -- Try to add meta_ads to enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'meta_ads' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'platform_type')
  ) THEN
    ALTER TYPE platform_type ADD VALUE 'meta_ads';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If enum modification fails, we'll handle meta_ads separately
    RAISE NOTICE 'Could not add meta_ads to platform_type enum. Will use facebook platform with metadata.';
END $$;

-- ============================================
-- META_AD_DRAFTS Table
-- Stores ad drafts before publishing
-- ============================================

CREATE TABLE IF NOT EXISTS meta_ad_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL DEFAULT 'facebook', -- 'facebook' | 'instagram' | 'both'
    ad_type VARCHAR(20) NOT NULL, -- 'single_image' | 'single_video' | 'carousel'
    objective VARCHAR(50),
    optimization_goal VARCHAR(50),
    billing_event VARCHAR(50) DEFAULT 'IMPRESSIONS',
    status VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'pending' | 'published' | 'failed'
    creative JSONB NOT NULL DEFAULT '{}',
    targeting JSONB DEFAULT '{}',
    budget JSONB DEFAULT '{}',
    schedule JSONB DEFAULT '{}',
    meta_ad_id VARCHAR(255), -- Meta API ad ID after publishing
    meta_creative_id VARCHAR(255), -- Meta API creative ID
    meta_adset_id VARCHAR(255), -- Meta API ad set ID
    meta_campaign_id VARCHAR(255), -- Meta API campaign ID
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT valid_ad_type CHECK (ad_type IN ('single_image', 'single_video', 'carousel')),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'published', 'failed'))
);

-- Indexes for meta_ad_drafts
CREATE INDEX IF NOT EXISTS idx_meta_ad_drafts_workspace ON meta_ad_drafts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_drafts_user ON meta_ad_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_drafts_status ON meta_ad_drafts(status);
CREATE INDEX IF NOT EXISTS idx_meta_ad_drafts_created ON meta_ad_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ad_drafts_meta_ad_id ON meta_ad_drafts(meta_ad_id) WHERE meta_ad_id IS NOT NULL;

-- ============================================
-- META_ADS Table
-- Tracks created ads for audit trail and sync
-- ============================================

CREATE TABLE IF NOT EXISTS meta_ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_ad_id VARCHAR(255) NOT NULL UNIQUE, -- Meta API ad ID
    meta_creative_id VARCHAR(255), -- Meta API creative ID
    meta_adset_id VARCHAR(255) NOT NULL,
    meta_campaign_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | etc.
    effective_status VARCHAR(50),
    delivery_status VARCHAR(50),
    creative JSONB NOT NULL DEFAULT '{}',
    insights JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for meta_ads
CREATE INDEX IF NOT EXISTS idx_meta_ads_workspace ON meta_ads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_user ON meta_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_meta_id ON meta_ads(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_status ON meta_ads(status);
CREATE INDEX IF NOT EXISTS idx_meta_ads_adset ON meta_ads(meta_adset_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaign ON meta_ads(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_created ON meta_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_active ON meta_ads(workspace_id) WHERE deleted_at IS NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp for meta_ad_drafts
DROP TRIGGER IF EXISTS update_meta_ad_drafts_updated_at ON meta_ad_drafts;
CREATE TRIGGER update_meta_ad_drafts_updated_at 
    BEFORE UPDATE ON meta_ad_drafts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for meta_ads
DROP TRIGGER IF EXISTS update_meta_ads_updated_at ON meta_ads;
CREATE TRIGGER update_meta_ads_updated_at 
    BEFORE UPDATE ON meta_ads
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE meta_ad_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;

-- Meta Ad Drafts Policies
CREATE POLICY "Users can manage their ad drafts"
    ON meta_ad_drafts FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Meta Ads Policies
CREATE POLICY "Users can view ads in their workspace"
    ON meta_ads FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create ads in their workspace"
    ON meta_ads FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update ads in their workspace"
    ON meta_ads FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete ads in their workspace"
    ON meta_ads FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

