-- ============================================
-- COMMENT AGENT DATABASE TABLES
-- Migration for AI-powered comment management
-- ============================================

-- ============================================
-- PENDING COMMENTS TABLE
-- Stores comments that need user expertise
-- ============================================
CREATE TABLE IF NOT EXISTS pending_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiers (for API calls & duplicate prevention)
  comment_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube', 'tiktok')),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Comment details
  username TEXT NOT NULL,
  original_comment TEXT NOT NULL,
  comment_timestamp TIMESTAMPTZ,
  post_caption TEXT, -- Optional: context about what post this is on
  
  -- AI Analysis
  summary TEXT NOT NULL, -- 1-line summary: "Asking about bulk pricing"
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'deleted', 'dismissed')),
  user_reply TEXT,
  replied_at TIMESTAMPTZ,
  reply_id TEXT, -- ID of the reply comment from Graph API
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(comment_id, workspace_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pending_workspace ON pending_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_comments(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_platform ON pending_comments(workspace_id, platform);
CREATE INDEX IF NOT EXISTS idx_pending_created ON pending_comments(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_comment_id ON pending_comments(comment_id);

-- ============================================
-- COMPANY KNOWLEDGE TABLE
-- Knowledge base for AI to search before answering
-- ============================================
CREATE TABLE IF NOT EXISTS company_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Knowledge content
  category TEXT NOT NULL CHECK (category IN (
    'faq', 
    'policy', 
    'product', 
    'pricing', 
    'shipping', 
    'returns', 
    'support',
    'hours',
    'contact',
    'general'
  )),
  title TEXT NOT NULL,           -- Short title: "Return Policy"
  question TEXT,                 -- Common question this answers: "What is your return policy?"
  answer TEXT NOT NULL,          -- The answer/policy content
  keywords TEXT[],               -- Keywords for search matching
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_workspace ON company_knowledge(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON company_knowledge(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON company_knowledge(workspace_id, is_active);

-- ============================================
-- COMMENT AGENT LOGS TABLE
-- Track agent runs for monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS comment_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Run details
  run_type TEXT DEFAULT 'cron' CHECK (run_type IN ('cron', 'manual')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  comments_fetched INTEGER DEFAULT 0,
  auto_replied INTEGER DEFAULT 0,
  escalated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  
  -- Error details if any
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_workspace ON comment_agent_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON comment_agent_logs(workspace_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE pending_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_agent_logs ENABLE ROW LEVEL SECURITY;

-- Policies for pending_comments
CREATE POLICY "Users can view workspace pending comments"
  ON pending_comments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert workspace pending comments"
  ON pending_comments FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update workspace pending comments"
  ON pending_comments FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete workspace pending comments"
  ON pending_comments FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

-- Policies for company_knowledge
CREATE POLICY "Users can view workspace knowledge"
  ON company_knowledge FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage workspace knowledge"
  ON company_knowledge FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

-- Policies for comment_agent_logs
CREATE POLICY "Users can view workspace agent logs"
  ON comment_agent_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE id = auth.uid()
  ));

-- ============================================
-- HELPER FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pending_comments_updated_at ON pending_comments;
CREATE TRIGGER update_pending_comments_updated_at
  BEFORE UPDATE ON pending_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_knowledge_updated_at ON company_knowledge;
CREATE TRIGGER update_company_knowledge_updated_at
  BEFORE UPDATE ON company_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
