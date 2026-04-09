-- ============================================================
-- Phase 1 Migrations: Search Prompt Monitoring,
-- Brand Visibility Tracking, Weekly Automated Scans
-- Run these in Supabase SQL Editor in order.
-- ============================================================

-- 1. Add scan_type column to scans
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS scan_type TEXT NOT NULL DEFAULT 'manual'
  CHECK (scan_type IN ('manual', 'automated'));

-- 2. Add model_scores jsonb column to scans
--    Stores per-model visibility percentages, e.g. {"chatgpt": 83, "claude": 67, "perplexity": 50}
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS model_scores JSONB;

-- 3. Create search_prompts table for custom prompt monitoring
CREATE TABLE IF NOT EXISTS search_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS for search_prompts
ALTER TABLE search_prompts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_prompts' AND policyname = 'Users manage own prompts'
  ) THEN
    CREATE POLICY "Users manage own prompts"
      ON search_prompts
      FOR ALL
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
