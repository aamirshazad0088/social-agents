# Database Migrations

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file you need to run
4. Copy and paste the entire SQL content
5. Click **Run** to execute the migration

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

## 🔴 CRITICAL: Migration 005 - Cleanup Post Management

**Date:** 2025-11-30

**Purpose:** Streamlines the database by removing unused features (campaigns, approvals, A/B tests)

**Changes:**
- ✅ Updates `post_status` enum to only: `ready_to_publish`, `scheduled`, `published`, `failed`
- ✅ Removes `campaigns`, `approvals`, `a_b_tests`, `a_b_test_variants`, `campaign_analytics` tables
- ✅ Removes `campaign_id` column from posts table
- ✅ Removes `approval_status` and `campaign_status` enum types
- ✅ Updates any existing draft/needs_approval/approved posts to `ready_to_publish`

**Impact:** 
- Simplifies the post workflow to: **ready_to_publish** → scheduled → published
- Removes unused campaign and approval functionality
- Reduces database complexity

**Safe to run:** Yes - Migration handles existing data gracefully

---

## 🔴 CRITICAL: Migration 009 - Create Media Storage Bucket

**Date:** 2025-11-10

**Purpose:** Fixes 413 Payload Too Large error when saving posts with images/videos

**Error Fixed:**
```
413 Payload Too Large
Error updating post in database: Error: Failed to update post
```

**Changes:**
- ✅ Creates a public `media` storage bucket for images and videos
- ✅ Sets up RLS policies for authenticated uploads and public read access
- ✅ Configures 100MB file size limit for video support
- ✅ Allows MIME types: PNG, JPEG, GIF, WebP, SVG, MP4, WebM, QuickTime
- ✅ Automatic upload of base64 images/videos to storage instead of database

**Impact:** 
- **REQUIRED TO FIX 413 ERROR** - Without this, large images/videos will fail to save
- Converts base64-encoded media to cloud storage URLs (reduces database size)
- Improves performance and scalability
- Posts with existing base64 images will auto-migrate on next update

**Safe to run:** Yes - Creates bucket with `ON CONFLICT DO NOTHING` (won't break existing setup)

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `009_create_media_storage.sql`
3. Paste and click **Run**
4. Verify "Successfully created media storage bucket" message appears
5. Check Storage → Buckets to confirm `media` bucket exists

**Note:** After running this migration, the app will automatically upload new images/videos to storage.

---

## Migration 005 (Old): Add Missing Columns

**Date:** 2025-11-07

**Purpose:** Fixes schema inconsistencies between code and database

**Changes:**
- ✅ Adds `page_name` column to `social_accounts` table (for Facebook/Instagram pages)
- ✅ Adds `expires_at` column to `social_accounts` table (for token expiration)
- ✅ Creates `credential_audit_log` table (for OAuth audit trail)
- ✅ Adds `used_at` column to `workspace_invites` table
- ✅ Creates necessary indexes for performance
- ✅ Sets up RLS policies for security

**Impact:** 
- Fixes errors: "column social_accounts.page_name does not exist"
- Fixes errors: "Could not find the table 'public.credential_audit_log'"
- Fixes errors: "column workspace_invites.used_at does not exist"
- Enables proper OAuth connection tracking and auditing

**Safe to run:** Yes - Uses `IF NOT EXISTS` clauses to prevent errors if columns already exist

## Verification

After running the migration, verify it worked:

```sql
-- Check post_status enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'post_status'::regtype 
ORDER BY enumsortorder;

-- Should return: ready_to_publish, scheduled, published, failed

-- Check campaigns table is dropped
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'campaigns';
-- Should return no rows
```
