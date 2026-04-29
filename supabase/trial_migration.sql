-- ============================================================
-- Trial Migration: Add 7-day free trial to user_profiles
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add trial_ends_at column (null = no trial / already on paid plan)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Set trial for all existing free users (7 days from now)
UPDATE user_profiles
SET trial_ends_at = NOW() + INTERVAL '7 days'
WHERE plan = 'free' AND trial_ends_at IS NULL;

-- 3. Update the signup trigger to set trial on new users
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, plan, trial_ends_at)
  VALUES (NEW.id, 'free', NOW() + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
