-- =====================================================
-- Applied Fixes — Revert support migration
-- Adds columns + status values needed for the Fix History / Revert feature
-- in the Chrome extension.
--
-- New columns:
--   reverted_at         — timestamp when the user reverted this fix
--   reverted_commit_sha — for GitHub reverts, the SHA of the revert commit
--   previous_value      — JSONB blob captured at apply time so WordPress fixes
--                          can be PATCHed back to their pre-Surven state
--
-- Extends the status CHECK to allow 'reverted' and 'skipped' (already used in code).
-- Adds an index on (business_id, applied_at DESC) for the History list query.
-- =====================================================

ALTER TABLE applied_fixes
  ADD COLUMN IF NOT EXISTS reverted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_commit_sha text,
  ADD COLUMN IF NOT EXISTS previous_value      jsonb;

ALTER TABLE applied_fixes
  DROP CONSTRAINT IF EXISTS applied_fixes_status_check;

ALTER TABLE applied_fixes
  ADD CONSTRAINT applied_fixes_status_check
  CHECK (status IN ('pending', 'applied', 'failed', 'skipped', 'reverted'));

CREATE INDEX IF NOT EXISTS idx_applied_fixes_business_applied_at
  ON applied_fixes (business_id, applied_at DESC);

-- The audit_id column was originally NOT NULL and references crawlability_audits.
-- Extension fixes don't always have a paired audit row (the extension audits in-memory),
-- so the apply-fix code already inserts with audit_id = null. Make this explicit here in
-- case earlier deployments still have the NOT NULL.
ALTER TABLE applied_fixes
  ALTER COLUMN audit_id DROP NOT NULL;
