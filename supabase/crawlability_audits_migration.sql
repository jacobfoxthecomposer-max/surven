-- =====================================================
-- Crawlability Audit — Phase 1 Migration
-- Run this in Supabase SQL Editor before deploying
-- =====================================================

CREATE TABLE IF NOT EXISTS crawlability_audits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  site_url            text NOT NULL,
  status              text NOT NULL CHECK (status IN ('completed', 'failed')),
  crawlability_score  integer,
  findings            jsonb NOT NULL DEFAULT '[]',
  status_breakdown    jsonb,
  category_scores     jsonb,
  homepage_meta       jsonb,
  robots_analysis     jsonb,
  sitemap_analysis    jsonb,
  redirect_chains     jsonb,
  crawl_pages         integer,
  crawl_hit_limit     boolean,
  crawl_duration_ms   integer,
  scan_started_at     timestamptz,
  scan_completed_at   timestamptz,
  cache_expires_at    timestamptz,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawlability_audits_business_cache
  ON crawlability_audits (business_id, site_url, cache_expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawlability_audits_business_started
  ON crawlability_audits (business_id, scan_started_at DESC);

ALTER TABLE crawlability_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own crawlability audits" ON crawlability_audits;
CREATE POLICY "Users read own crawlability audits"
  ON crawlability_audits FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
