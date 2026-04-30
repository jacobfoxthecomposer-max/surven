-- ============================================================
-- Extension API Keys Migration: Premium-only API key management
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Create extension_api_keys table
CREATE TABLE IF NOT EXISTS extension_api_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key               TEXT NOT NULL UNIQUE,
  name              TEXT DEFAULT 'Default Key',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ
);

-- Partial unique index: one active key per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_key_per_user
  ON extension_api_keys (user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE extension_api_keys ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policy: Users can only see their own keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'extension_api_keys' AND policyname = 'Users manage own extension keys'
  ) THEN
    CREATE POLICY "Users manage own extension keys"
      ON extension_api_keys
      FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Helper function to generate a random API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  key := 'sv_ext_' || encode(gen_random_bytes(32), 'hex');
  RETURN key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to create a new API key for a user (premium-only)
CREATE OR REPLACE FUNCTION create_extension_api_key(p_user_id UUID, p_key_name TEXT DEFAULT 'Default Key')
RETURNS TABLE(key TEXT, error TEXT) AS $$
DECLARE
  v_plan TEXT;
  v_key TEXT;
BEGIN
  -- Check if user has premium plan
  SELECT plan INTO v_plan FROM user_profiles WHERE user_id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, 'User profile not found'::TEXT;
    RETURN;
  END IF;

  IF v_plan != 'premium' AND v_plan != 'admin' THEN
    RETURN QUERY SELECT NULL::TEXT, 'Only premium users can create API keys'::TEXT;
    RETURN;
  END IF;

  -- Revoke any existing active key
  UPDATE extension_api_keys
  SET revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked_at IS NULL;

  -- Generate and store new key
  v_key := generate_api_key();

  INSERT INTO extension_api_keys (user_id, key, name)
  VALUES (p_user_id, v_key, p_key_name);

  RETURN QUERY SELECT v_key::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to validate an API key and return user info
CREATE OR REPLACE FUNCTION validate_extension_api_key(p_key TEXT)
RETURNS TABLE(user_id UUID, valid BOOLEAN, plan TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eak.user_id,
    true::BOOLEAN,
    up.plan
  FROM extension_api_keys eak
  JOIN user_profiles up ON eak.user_id = up.user_id
  WHERE eak.key = p_key
    AND eak.revoked_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
