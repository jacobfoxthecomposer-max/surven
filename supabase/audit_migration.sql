-- Website Audit feature — run in Supabase SQL Editor
-- Creates audits table with 24-hour caching support

CREATE TABLE IF NOT EXISTS audits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  site_url          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  findings          JSONB,
  homepage_meta     JSONB,
  crawl_pages       INT,
  crawl_hit_limit   BOOLEAN,
  crawl_duration_ms INT,
  error_message     TEXT,
  scan_started_at   TIMESTAMPTZ NOT NULL,
  scan_completed_at TIMESTAMPTZ,
  cache_expires_at  TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup: find cached audits for a business
CREATE INDEX IF NOT EXISTS idx_audits_business_cache
  ON audits (business_id, cache_expires_at DESC);

-- RLS: users can only read audits for their own businesses
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audits"
  ON audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = audits.business_id
        AND businesses.user_id = auth.uid()
    )
  );
