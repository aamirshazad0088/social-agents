-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Streamlined schema: No campaigns, approvals, or A/B tests

CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.checkpoint_blobs (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  channel text NOT NULL,
  version text NOT NULL,
  type text NOT NULL,
  blob bytea,
  CONSTRAINT checkpoint_blobs_pkey PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE public.checkpoint_migrations (
  v integer NOT NULL,
  CONSTRAINT checkpoint_migrations_pkey PRIMARY KEY (v)
);

CREATE TABLE public.checkpoint_writes (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  checkpoint_id text NOT NULL,
  task_id text NOT NULL,
  idx integer NOT NULL,
  channel text NOT NULL,
  type text,
  blob bytea NOT NULL,
  CONSTRAINT checkpoint_writes_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE TABLE public.checkpoints (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT ''::text,
  checkpoint_id text NOT NULL,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT checkpoints_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE public.content_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  title character varying,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  lang_thread_id text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{"preview": "", "messageCount": 0}'::jsonb,
  CONSTRAINT content_threads_pkey PRIMARY KEY (id),
  CONSTRAINT content_threads_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT content_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.credential_audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  platform USER-DEFINED NOT NULL,
  action character varying NOT NULL,
  status character varying NOT NULL,
  error_message text,
  error_code character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credential_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT credential_audit_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT credential_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type USER-DEFINED NOT NULL,
  source USER-DEFINED DEFAULT 'uploaded'::media_source,
  url text NOT NULL,
  file_url character varying,
  thumbnail_url text,
  size bigint NOT NULL,
  file_size integer,
  width integer,
  height integer,
  duration_seconds integer,
  tags ARRAY DEFAULT '{}'::text[],
  alt_text character varying,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  is_carousel_slide boolean DEFAULT false,
  carousel_group_id uuid,
  slide_number integer,
  carousel_metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT media_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.oauth_states (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  platform USER-DEFINED NOT NULL,
  state character varying NOT NULL UNIQUE,
  code_challenge character varying,
  code_challenge_method character varying,
  ip_address character varying,
  user_agent text,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT oauth_states_pkey PRIMARY KEY (id),
  CONSTRAINT oauth_states_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.post_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  platform USER-DEFINED NOT NULL,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  shares integer DEFAULT 0,
  comments integer DEFAULT 0,
  likes integer DEFAULT 0,
  reposts integer DEFAULT 0,
  replies integer DEFAULT 0,
  saves integer DEFAULT 0,
  engagement_total integer DEFAULT 0,
  engagement integer DEFAULT 0,
  fetched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT post_analytics_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_analytics_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.post_content (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  text_content text,
  description text,
  hashtags ARRAY,
  mentions ARRAY,
  call_to_action character varying,
  version_number integer NOT NULL,
  change_summary text,
  changed_by uuid,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_content_pkey PRIMARY KEY (id),
  CONSTRAINT post_content_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_content_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);

CREATE TABLE public.post_library (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  original_post_id uuid,
  title character varying,
  topic character varying,
  post_type character varying,
  platforms ARRAY,
  content jsonb,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  platform_data jsonb,
  metrics jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_carousel boolean DEFAULT false,
  carousel_data jsonb,
  CONSTRAINT post_library_pkey PRIMARY KEY (id),
  CONSTRAINT post_library_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT post_library_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.post_media (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  position_order integer DEFAULT 0,
  usage_caption text,
  created_at timestamp with time zone DEFAULT now(),
  is_carousel_slide boolean DEFAULT false,
  slide_metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT post_media_pkey PRIMARY KEY (id),
  CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id)
);

CREATE TABLE public.post_platforms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  platform USER-DEFINED NOT NULL,
  platform_post_id character varying,
  platform_status character varying,
  platform_error_message text,
  platform_impressions integer DEFAULT 0,
  platform_engagement integer DEFAULT 0,
  platform_reach integer DEFAULT 0,
  posted_at timestamp with time zone,
  error_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_platforms_pkey PRIMARY KEY (id),
  CONSTRAINT post_platforms_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);

CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title character varying,
  topic text NOT NULL,
  post_type character varying DEFAULT 'post'::character varying,
  platforms ARRAY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform_templates jsonb DEFAULT '{}'::jsonb,
  status USER-DEFINED DEFAULT 'ready_to_publish'::post_status,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  engagement_score integer,
  engagement_suggestions ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  is_carousel boolean DEFAULT false,
  carousel_slide_count integer,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.social_accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  platform USER-DEFINED NOT NULL,
  credentials_encrypted text NOT NULL,
  refresh_token_encrypted character varying,
  username character varying,
  account_id character varying,
  account_name character varying,
  profile_picture_url character varying,
  is_connected boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  connected_at timestamp with time zone,
  last_verified_at timestamp with time zone,
  access_token_expires_at timestamp with time zone,
  last_refreshed_at timestamp with time zone,
  refresh_error_count integer DEFAULT 0,
  last_error_message text,
  platform_user_id character varying,
  page_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  page_name character varying,
  expires_at timestamp with time zone,
  CONSTRAINT social_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT social_accounts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.store (
  namespace_path text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  CONSTRAINT store_pkey PRIMARY KEY (namespace_path, key)
);

CREATE TABLE public.store_migrations (
  v integer NOT NULL,
  CONSTRAINT store_migrations_pkey PRIMARY KEY (v)
);

CREATE TABLE public.users (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role USER-DEFINED NOT NULL DEFAULT 'viewer'::user_role,
  avatar_url text,
  phone character varying,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
);

CREATE TABLE public.workspace_invites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL,
  email character varying,
  invited_by uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'viewer'::user_role,
  token character varying NOT NULL UNIQUE,
  is_accepted boolean DEFAULT false,
  accepted_at timestamp with time zone,
  accepted_by_user_id uuid,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  CONSTRAINT workspace_invites_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_invites_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id),
  CONSTRAINT workspace_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT workspace_invites_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id)
);

CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  logo_url character varying,
  max_users integer DEFAULT 10,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);
