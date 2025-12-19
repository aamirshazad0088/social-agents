-- ============================================
-- Migration: Update Meta Ads for API v24.0
-- Description: Adds new fields for Meta Marketing API v24.0
-- Date: 2025-12-04
-- ============================================

-- ============================================
-- UPDATE META_AD_DRAFTS Table
-- Add v24.0 specific fields
-- ============================================

-- Add destination_type for messaging/call ads (v24.0)
ALTER TABLE meta_ad_drafts 
ADD COLUMN IF NOT EXISTS destination_type VARCHAR(50);

COMMENT ON COLUMN meta_ad_drafts.destination_type IS 
'v24.0: WEBSITE, APP, MESSENGER, WHATSAPP, INSTAGRAM_DIRECT, PHONE_CALL, SHOP, etc.';

-- Add bid_strategy column
ALTER TABLE meta_ad_drafts 
ADD COLUMN IF NOT EXISTS bid_strategy VARCHAR(50);

COMMENT ON COLUMN meta_ad_drafts.bid_strategy IS 
'LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS';

-- Add campaign_name for the full ad creation flow
ALTER TABLE meta_ad_drafts 
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255);

-- Add adset_name for the full ad creation flow
ALTER TABLE meta_ad_drafts 
ADD COLUMN IF NOT EXISTS adset_name VARCHAR(255);

-- Add ad_name for better naming
ALTER TABLE meta_ad_drafts 
ADD COLUMN IF NOT EXISTS ad_name VARCHAR(255);

-- ============================================
-- UPDATE META_ADS Table
-- Add v24.0 specific fields for sync/audit
-- ============================================

-- Add destination_type
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS destination_type VARCHAR(50);

-- Add bid_strategy
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS bid_strategy VARCHAR(50);

-- Add optimization_goal
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS optimization_goal VARCHAR(50);

-- Add billing_event
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS billing_event VARCHAR(50) DEFAULT 'IMPRESSIONS';

-- Add targeting (for local cache/audit)
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS targeting JSONB DEFAULT '{}';

-- Add budget info
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS daily_budget BIGINT;
ALTER TABLE meta_ads 
ADD COLUMN IF NOT EXISTS lifetime_budget BIGINT;

-- ============================================
-- CREATE META_CAMPAIGNS Table (NEW)
-- Track campaigns locally for better UX
-- ============================================

CREATE TABLE IF NOT EXISTS meta_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_campaign_id VARCHAR(255) NOT NULL UNIQUE, -- Meta API campaign ID
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(50) NOT NULL, -- OUTCOME_AWARENESS, OUTCOME_TRAFFIC, etc.
    status VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
    effective_status VARCHAR(50),
    buying_type VARCHAR(20) DEFAULT 'AUCTION',
    bid_strategy VARCHAR(50),
    daily_budget BIGINT, -- In cents
    lifetime_budget BIGINT, -- In cents
    spend_cap BIGINT,
    special_ad_categories JSONB DEFAULT '[]',
    is_campaign_budget_optimization BOOLEAN DEFAULT FALSE,
    insights JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for meta_campaigns
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_workspace ON meta_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_meta_id ON meta_campaigns(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON meta_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_objective ON meta_campaigns(objective);

-- ============================================
-- CREATE META_ADSETS Table (NEW)
-- Track ad sets locally for better UX
-- ============================================

CREATE TABLE IF NOT EXISTS meta_adsets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_adset_id VARCHAR(255) NOT NULL UNIQUE, -- Meta API ad set ID
    meta_campaign_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
    effective_status VARCHAR(50),
    optimization_goal VARCHAR(50) NOT NULL,
    billing_event VARCHAR(50) DEFAULT 'IMPRESSIONS',
    bid_strategy VARCHAR(50),
    bid_amount BIGINT, -- In cents
    daily_budget BIGINT, -- In cents
    lifetime_budget BIGINT, -- In cents
    destination_type VARCHAR(50), -- v24.0: WEBSITE, MESSENGER, WHATSAPP, PHONE_CALL, etc.
    targeting JSONB DEFAULT '{}',
    promoted_object JSONB DEFAULT '{}',
    attribution_spec JSONB DEFAULT '[]', -- v24.0: conversion attribution
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    insights JSONB DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for meta_adsets
CREATE INDEX IF NOT EXISTS idx_meta_adsets_workspace ON meta_adsets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_meta_id ON meta_adsets(meta_adset_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_campaign ON meta_adsets(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_status ON meta_adsets(status);
CREATE INDEX IF NOT EXISTS idx_meta_adsets_optimization ON meta_adsets(optimization_goal);

-- ============================================
-- TRIGGERS for new tables
-- ============================================

-- Update timestamp trigger for meta_campaigns
DROP TRIGGER IF EXISTS update_meta_campaigns_updated_at ON meta_campaigns;
CREATE TRIGGER update_meta_campaigns_updated_at 
    BEFORE UPDATE ON meta_campaigns
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for meta_adsets
DROP TRIGGER IF EXISTS update_meta_adsets_updated_at ON meta_adsets;
CREATE TRIGGER update_meta_adsets_updated_at 
    BEFORE UPDATE ON meta_adsets
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY for new tables
-- ============================================

-- Enable RLS
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_adsets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view campaigns in their workspace" ON meta_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns in their workspace" ON meta_campaigns;
DROP POLICY IF EXISTS "Users can update campaigns in their workspace" ON meta_campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns in their workspace" ON meta_campaigns;

DROP POLICY IF EXISTS "Users can view adsets in their workspace" ON meta_adsets;
DROP POLICY IF EXISTS "Users can create adsets in their workspace" ON meta_adsets;
DROP POLICY IF EXISTS "Users can update adsets in their workspace" ON meta_adsets;
DROP POLICY IF EXISTS "Admins can delete adsets in their workspace" ON meta_adsets;

-- Meta Campaigns Policies
CREATE POLICY "Users can view campaigns in their workspace"
    ON meta_campaigns FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create campaigns in their workspace"
    ON meta_campaigns FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update campaigns in their workspace"
    ON meta_campaigns FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete campaigns in their workspace"
    ON meta_campaigns FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Meta Ad Sets Policies
CREATE POLICY "Users can view adsets in their workspace"
    ON meta_adsets FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create adsets in their workspace"
    ON meta_adsets FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update adsets in their workspace"
    ON meta_adsets FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete adsets in their workspace"
    ON meta_adsets FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- UPDATE objective constraint for v24.0
-- ============================================

-- Add constraint for valid objectives (OUTCOME-based v24.0)
-- Note: This is informational, actual validation happens in application code
COMMENT ON COLUMN meta_campaigns.objective IS 
'v24.0 OUTCOME-based objectives: OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION';

COMMENT ON COLUMN meta_adsets.optimization_goal IS 
'v24.0 goals: REACH, IMPRESSIONS, LINK_CLICKS, LANDING_PAGE_VIEWS, QUALITY_CALL, QUALITY_LEAD, LEAD_GENERATION, OFFSITE_CONVERSIONS, etc.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
