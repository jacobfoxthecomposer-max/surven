-- ============================================================
-- Rename Plans Migration: premium → plus, enterprise → premium
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Drop the existing check constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_plan_check;

-- 2. Rename existing plan values in the table
UPDATE user_profiles SET plan = 'plus'    WHERE plan = 'premium';
UPDATE user_profiles SET plan = 'premium' WHERE plan = 'enterprise';

-- 3. Re-add the constraint with the new plan names
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_plan_check
  CHECK (plan IN ('free', 'plus', 'premium', 'admin'));

-- 4. Update the create_extension_api_key function
CREATE OR REPLACE FUNCTION create_extension_api_key(p_user_id UUID, p_key_name TEXT DEFAULT 'Default Key')
RETURNS TABLE(key TEXT, error TEXT) AS $$
DECLARE
  v_plan TEXT;
  v_key TEXT;
BEGIN
  SELECT plan INTO v_plan FROM user_profiles WHERE user_id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, 'User profile not found'::TEXT;
    RETURN;
  END IF;

  IF v_plan NOT IN ('plus', 'premium', 'admin') THEN
    RETURN QUERY SELECT NULL::TEXT, 'Only premium users can create API keys'::TEXT;
    RETURN;
  END IF;

  UPDATE extension_api_keys
  SET revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked_at IS NULL;

  v_key := 'sv_ext_' || encode(gen_random_bytes(32), 'hex');

  INSERT INTO extension_api_keys (user_id, key, name)
  VALUES (p_user_id, v_key, p_key_name);

  RETURN QUERY SELECT v_key::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
