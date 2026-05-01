-- =====================================================
-- Site Connections — Phase 3 Migration
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS site_connections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id      uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform         text NOT NULL CHECK (platform IN ('github', 'vercel', 'wordpress', 'webflow')),
  credentials      jsonb NOT NULL,
  repo             text,
  branch           text,
  site_id          text,
  site_url         text,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
  last_verified_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_site_connections_user
  ON site_connections (user_id);

CREATE INDEX IF NOT EXISTS idx_site_connections_business
  ON site_connections (business_id);

ALTER TABLE site_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own site connections" ON site_connections;
CREATE POLICY "Users manage own site connections"
  ON site_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
