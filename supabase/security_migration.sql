-- ============================================================
-- Security Migration: User Profiles (plan tiers) + Scan Rate Limiting
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. user_profiles — stores free/premium plan per user
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users read own profile'
  ) THEN
    CREATE POLICY "Users read own profile"
      ON user_profiles FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Auto-create a free profile when a new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Backfill profiles for any existing users
INSERT INTO user_profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;


-- 2. scan_counts — tracks daily scan usage per user
CREATE TABLE IF NOT EXISTS scan_counts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date    DATE NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- No RLS — only accessed via service role key in the API


-- 3. Atomic increment function — prevents race conditions
--    Returns the new count after increment.
CREATE OR REPLACE FUNCTION increment_scan_count(p_user_id UUID, p_date DATE)
RETURNS INTEGER AS $$
  INSERT INTO scan_counts (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date) DO UPDATE SET count = scan_counts.count + 1
  RETURNING count;
$$ LANGUAGE SQL SECURITY DEFINER;
