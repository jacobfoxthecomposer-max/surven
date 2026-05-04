-- Allow 'plus' plan to create extension API keys.
--
-- The original `extension_api_keys_migration.sql` restricted key creation to
-- 'premium' and 'admin' plans. The /api/audit/run, /api/audit/apply-fix, and
-- /api/audit/generate routes accept ['plus', 'premium', 'admin'] (see
-- src/utils/managedPlanCta.ts PAID_PLANS). This migration brings the DB
-- function in sync so Plus users can actually generate keys.
--
-- Run in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION create_extension_api_key(p_user_id UUID)
RETURNS TABLE(api_key TEXT, message TEXT) AS $$
DECLARE
  v_plan TEXT;
  v_key TEXT;
  v_key_prefix TEXT;
  v_key_hash TEXT;
BEGIN
  -- Check the user's plan tier.
  SELECT plan INTO v_plan FROM user_profiles WHERE user_id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, 'User profile not found'::TEXT;
    RETURN;
  END IF;

  -- Plus, Premium, and Admin plans can create keys.
  IF v_plan != 'plus' AND v_plan != 'premium' AND v_plan != 'admin' THEN
    RETURN QUERY SELECT NULL::TEXT, 'Upgrade to Plus, Premium, or Admin to create API keys'::TEXT;
    RETURN;
  END IF;

  -- Generate a 32-byte random key, prefix the first 8 chars, and store a SHA-256 hash.
  v_key := encode(gen_random_bytes(32), 'hex');
  v_key_prefix := substring(v_key from 1 for 8);
  v_key_hash := encode(digest(v_key, 'sha256'), 'hex');

  INSERT INTO extension_api_keys (user_id, key_hash, key_prefix)
  VALUES (p_user_id, v_key_hash, v_key_prefix);

  RETURN QUERY SELECT v_key, 'API key created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
