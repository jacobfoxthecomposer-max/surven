-- =====================================================
-- Applied Fixes — Phase 4 Migration
-- Tracks fixes that have been auto-applied via GitHub/Vercel/etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS applied_fixes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  audit_id        uuid NOT NULL REFERENCES crawlability_audits(id) ON DELETE CASCADE,
  finding_id      text NOT NULL,
  fix_type        text NOT NULL,
  platform        text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed')),
  committed_sha   text,
  commit_url      text,
  file_path       text,
  error_message   text,
  applied_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applied_fixes_audit ON applied_fixes (audit_id);
CREATE INDEX IF NOT EXISTS idx_applied_fixes_business ON applied_fixes (business_id);

ALTER TABLE applied_fixes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own applied fixes" ON applied_fixes;
CREATE POLICY "Users read own applied fixes"
  ON applied_fixes FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
