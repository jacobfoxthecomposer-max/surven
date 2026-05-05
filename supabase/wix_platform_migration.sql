-- Add 'wix' to the allowed platforms for site_connections.
--
-- The existing CHECK constraint (created in phase0_site_editing_engine_migration.sql)
-- limited the platform column to: github, vercel, wordpress, webflow, shopify, netlify,
-- cloudflare. Sprint 3 adds Wix integration, so we need to extend that list.
--
-- Run this in the Supabase SQL editor.

ALTER TABLE site_connections
  DROP CONSTRAINT IF EXISTS site_connections_platform_check;

ALTER TABLE site_connections
  ADD CONSTRAINT site_connections_platform_check
  CHECK (platform IN ('github', 'vercel', 'wordpress', 'webflow', 'shopify', 'netlify', 'cloudflare', 'wix'));
