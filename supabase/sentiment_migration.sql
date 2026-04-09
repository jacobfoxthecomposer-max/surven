-- Phase 2: Sentiment Analysis
-- Run in Supabase SQL Editor

ALTER TABLE scan_results
  ADD COLUMN IF NOT EXISTS sentiment TEXT
  CHECK (sentiment IN ('positive', 'neutral', 'negative'));
