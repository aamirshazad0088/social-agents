-- Create content_calendar_entries table for storing scheduled content

CREATE TABLE IF NOT EXISTS content_calendar_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'twitter', 'tiktok', 'youtube', 'facebook')),
    content_type TEXT NOT NULL CHECK (content_type IN ('educational', 'fun', 'inspirational', 'promotional', 'interactive', 'brand_related', 'evergreen', 'holiday_themed')),
    title TEXT NOT NULL,
    content TEXT,
    hashtags TEXT[],
    image_prompt TEXT,
    image_url TEXT,
    video_script TEXT,
    video_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE content_calendar_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view entries in their workspace
CREATE POLICY "Users can view workspace calendar entries"
    ON content_calendar_entries
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert entries in their workspace
CREATE POLICY "Users can create workspace calendar entries"
    ON content_calendar_entries
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can update entries in their workspace
CREATE POLICY "Users can update workspace calendar entries"
    ON content_calendar_entries
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete entries in their workspace
CREATE POLICY "Users can delete workspace calendar entries"
    ON content_calendar_entries
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM users WHERE id = auth.uid()
        )
    );

-- Create indexes for efficient queries
CREATE INDEX idx_calendar_entries_workspace_date ON content_calendar_entries(workspace_id, scheduled_date);
CREATE INDEX idx_calendar_entries_platform ON content_calendar_entries(workspace_id, platform);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_entries_updated_at
    BEFORE UPDATE ON content_calendar_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_entries_updated_at();
