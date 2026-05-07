-- prompt_variants_migration.sql
-- Cache table for LLM-generated prompt variants. Idempotent — safe to
-- run multiple times. Apply via the Supabase SQL editor for project
-- omwicoqjlsynvqavdqeu.
--
-- Flow:
--   1. User adds a prompt to the Tracker (or first expands its variants).
--   2. llmVariantSource.fetch() looks up (prompt_id, business_id).
--   3. Cache hit → return immediately. Cache miss → call Anthropic, then
--      upsert this row, then return.
--
-- Design notes:
--   - prompt_id is the canonical id from prompt-research, NOT a UUID. Keep
--     it as text so the same id format works whether the source is the
--     in-app intent set or an external scanner output.
--   - variants is JSONB storing an array of {id, text}. Arrays are small
--     (5–7 items) so JSONB indexing isn't needed; we always read the full
--     blob.
--   - generated_at lets us cheaply invalidate stale caches on schema
--     migrations or model upgrades — drop rows older than X days when the
--     prompt-generation prompt changes.
--   - One row per (prompt_id, business_id) — variants are
--     business-context-conditioned (industry, city, state), so the same
--     prompt id under a different business gets its own row.

create table if not exists public.prompt_variants (
  prompt_id      text not null,
  business_id    uuid not null references public.businesses(id) on delete cascade,
  variants       jsonb not null,
  generated_at   timestamptz not null default now(),
  primary key (prompt_id, business_id)
);

-- Index supports the cache-read hot path (.eq prompt_id .eq business_id).
-- The composite primary key already covers this, but an explicit comment
-- helps future readers understand why we don't add a separate index.

-- Row-Level Security — keep variants readable only by the owner of the
-- business they belong to. Uses the same pattern as other business-scoped
-- tables in this project.
alter table public.prompt_variants enable row level security;

drop policy if exists "Users read variants for their businesses"
  on public.prompt_variants;
create policy "Users read variants for their businesses"
  on public.prompt_variants
  for select
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

drop policy if exists "Users write variants for their businesses"
  on public.prompt_variants;
create policy "Users write variants for their businesses"
  on public.prompt_variants
  for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
