-- =====================================================
-- Phase 0 — Site Editing Engine Foundation
-- Adds Shopify support, framework detection metadata,
-- audit log, and job queue tables.
-- Run this in Supabase SQL Editor.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Extend site_connections: add Shopify + detection metadata
-- ─────────────────────────────────────────────────────

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_platform_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_platform_check
  CHECK (platform IN ('github', 'vercel', 'wordpress', 'webflow', 'shopify', 'netlify', 'cloudflare'));

ALTER TABLE site_connections
  ADD COLUMN IF NOT EXISTS detected_framework text,
  ADD COLUMN IF NOT EXISTS framework_meta    jsonb,
  ADD COLUMN IF NOT EXISTS detected_at       timestamptz;

COMMENT ON COLUMN site_connections.detected_framework IS
  'e.g. nextjs, astro, hugo, jekyll, wordpress-yoast, shopify-online-store-2-0';
COMMENT ON COLUMN site_connections.framework_meta IS
  'Detection probe results: {version, ssr, packageManager, buildTool, plugins:[...]}';

-- ─────────────────────────────────────────────────────
-- 2. surven_audit_log — granular event log for compliance + debugging
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS surven_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id   uuid REFERENCES businesses(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES site_connections(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  -- typed events: connection_created, connection_verified, connection_revoked,
  --               credentials_rotated, scan_started, scan_completed, scan_failed,
  --               webhook_received, webhook_verified, webhook_rejected,
  --               fix_proposed, fix_applied, fix_reverted, fix_failed,
  --               framework_detected, premium_granted, premium_revoked
  severity      text NOT NULL DEFAULT 'info'
                CHECK (severity IN ('debug', 'info', 'warn', 'error')),
  source        text NOT NULL,
  -- e.g. 'api/integrations/connect', 'webhook/github', 'job/scan-runner'
  payload       jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user        ON surven_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_business    ON surven_audit_log (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_connection  ON surven_audit_log (connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type  ON surven_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity    ON surven_audit_log (severity, created_at DESC)
  WHERE severity IN ('warn', 'error');

ALTER TABLE surven_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own audit log" ON surven_audit_log;
CREATE POLICY "Users read own audit log"
  ON surven_audit_log FOR SELECT
  USING (user_id = auth.uid());

-- Writes go through service role only — no insert policy needed.

-- ─────────────────────────────────────────────────────
-- 3. surven_jobs — backing table for the job queue
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS surven_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        text NOT NULL,
  -- e.g. 'detect-framework', 'first-scan', 'apply-fix', 'send-webhook',
  --      're-measure', 'rotate-credentials', 'validate-connection'
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority        smallint NOT NULL DEFAULT 5,
  -- 0 = highest, 9 = lowest. Default 5 is normal.
  attempts        smallint NOT NULL DEFAULT 0,
  max_attempts    smallint NOT NULL DEFAULT 3,
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  -- For delayed jobs, set this to future. Worker picks WHERE scheduled_for <= now().
  locked_at       timestamptz,
  locked_by       text,
  -- worker instance id, for distributed locking
  business_id     uuid REFERENCES businesses(id) ON DELETE CASCADE,
  connection_id   uuid REFERENCES site_connections(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  result          jsonb,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

-- Worker query index: claim next job
CREATE INDEX IF NOT EXISTS idx_jobs_claim
  ON surven_jobs (status, priority, scheduled_for)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_jobs_business ON surven_jobs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user     ON surven_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_locked   ON surven_jobs (locked_at)
  WHERE locked_at IS NOT NULL AND status = 'running';

ALTER TABLE surven_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own jobs" ON surven_jobs;
CREATE POLICY "Users read own jobs"
  ON surven_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Writes go through service role only.

-- ─────────────────────────────────────────────────────
-- 4. claim_next_job — atomic FOR UPDATE SKIP LOCKED
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION claim_next_job(worker_id text, job_types text[] DEFAULT NULL)
RETURNS surven_jobs AS $$
DECLARE
  claimed surven_jobs;
BEGIN
  UPDATE surven_jobs
  SET status     = 'running',
      locked_at  = now(),
      locked_by  = worker_id,
      attempts   = attempts + 1,
      started_at = COALESCE(started_at, now())
  WHERE id = (
    SELECT id FROM surven_jobs
    WHERE status = 'queued'
      AND scheduled_for <= now()
      AND (job_types IS NULL OR job_type = ANY(job_types))
    ORDER BY priority ASC, scheduled_for ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO claimed;

  RETURN claimed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─────────────────────────────────────────────────────
-- 5. release_stuck_jobs — recover crashed workers
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION release_stuck_jobs(stuck_after_minutes int DEFAULT 10)
RETURNS int AS $$
DECLARE
  released_count int;
BEGIN
  UPDATE surven_jobs
  SET status    = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
      locked_at = NULL,
      locked_by = NULL,
      error_message = CASE
        WHEN attempts >= max_attempts
        THEN 'Worker timed out after ' || stuck_after_minutes || ' minutes (max attempts reached)'
        ELSE error_message
      END
  WHERE status = 'running'
    AND locked_at < now() - (stuck_after_minutes || ' minutes')::interval;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
