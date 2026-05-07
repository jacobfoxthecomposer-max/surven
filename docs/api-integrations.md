# API integration touchpoints

> Living checklist of every spot in the Surven codebase that's currently mock-driven and waiting on a real API. When you wire one up, swap the source flag, run any related Supabase migration, and tick the box.

## Variant generation (lazy + cached)

**Status:** stub in place; falls back to mock until Anthropic call is wired.

**Pattern:** lazy-generate on first expansion, cache in Supabase forever (invalidate by deleting rows when the generation prompt changes).

| File | Purpose |
|------|---------|
| `src/services/variants/types.ts` | `Variant`, `VariantSource`, `VariantBusinessContext`, `VariantFetchOptions` interfaces. |
| `src/services/variants/mockVariantSource.ts` | Deterministic synthetic variants from a phrasing-template library. Active by default. |
| `src/services/variants/llmVariantSource.ts` | Anthropic + Supabase cache. `generateViaAnthropic` is the only stub left to implement. Currently falls back to mock so the env-flag flip is safe. |
| `src/services/variants/index.ts` | Picks the source by `NEXT_PUBLIC_VARIANT_SOURCE` env var (`mock` default; `llm` activates the cached LLM source). |
| `supabase/prompt_variants_migration.sql` | Cache table DDL. Apply via Supabase SQL editor when ready. RLS scoped to business owner. |

**To activate:**
1. Implement `generateViaAnthropic` in `llmVariantSource.ts` using the raw-fetch pattern from `src/services/openaiClient.ts`. Model: `claude-haiku-4-5`. Cost target: ~$0.0008 per call.
2. Set `ANTHROPIC_WIRED = true` in `llmVariantSource.ts`.
3. Add `ANTHROPIC_API_KEY` to Vercel project env (Production + Preview + Development).
4. Run `supabase/prompt_variants_migration.sql` against project `omwicoqjlsynvqavdqeu`.
5. Set `NEXT_PUBLIC_VARIANT_SOURCE=llm` in Vercel env.

## Scanner (per-engine mention + citation)

**Status:** real endpoint exists; UI still reads mock.

**Endpoint:** `POST /api/scan` — already queries OpenAI / Anthropic / Gemini / Google AI via SerpAPI (Jake built it).

**File:** `src/features/dashboard/pages/VisibilityScannerSection.tsx` → `useScannerData()` (currently calls `genLine()` mock generator).

**To activate:** replace the `useScannerData` body with `fetch('/api/scan', ...)` and surface a "Run Scan" button. Don't persist to Supabase yet — keep result in React state for the first pass. Test on `localhost:3000/visibility-preview`.

## Per-prompt link / citation data

**Status:** synthesized deterministically from prompt id + engine.

**Files:**
- `src/features/dashboard/pages/PromptsSection.tsx` → `linkHit()` helper
- `src/features/dashboard/pages/PromptsByCluster.tsx` → `synthMetrics.links`

**To activate:** when the scanner schema adds real per-engine link booleans on `ScanResult`, swap the helper guts. Call sites stay identical. Synth currently uses ~70% odds on mention for unbranded, ~90% for branded.

## Brand time-series for competitor charts

**Status:** all competitor charts read mock from `useScannerData()`.

**Files:** `src/features/competitor-comparison/CompetitorVisibilityChart.tsx`, `CompetitorRankAndSoVRow.tsx`, etc. — wrappers around exported components from `VisibilityScannerSection.tsx`.

**To activate:** when real per-brand time-series persists in Supabase, only the wrappers need to swap from mock to live. The canonical chart components stay untouched.

## Prompt-set change events (chart annotations)

**Status:** seeded inline in `ChartCard` from `data.dates` offsets.

**File:** `src/features/dashboard/pages/VisibilityScannerSection.tsx` (ChartCard `optimizationMarkers` + `promptChangeMarkers` props).

**Marker schema:** `{ date: Date, delta: number, detail?: string }` (prompt-change) and `{ date: Date, label: string }` (optimization). Real `Date` objects so events stay anchored to their calendar date when the user switches time range.

**To activate:** add a Supabase table `prompt_change_events` keyed on business_id with (date, delta, detail) and an `optimization_events` table with (date, label). Replace the inline mock seed with a Supabase fetch. Out-of-range events are auto-dropped by `findNearestDateIndex` in the chart.

## /feedback Gmail SMTP (production)

**Status:** local SMTP works (test confirmed 2026-05-02); Vercel env vars added 2026-05-03.

**File:** `src/app/api/feedback/route.ts` — Resend → Gmail SMTP → console-log fallback chain.

**Active in production via:** `GMAIL_USER` + `GMAIL_APP_PASSWORD` set on Vercel. Fallback to Resend if `RESEND_API_KEY` is set instead.

## AEO scanner (single-URL audit)

**Status:** real endpoint exists.

**Endpoint:** `POST /api/aeo-scan` — fetches target URL + well-known files, runs 25 checks via Cheerio.

**File:** `src/app/site-audit/page.tsx` passes `siteUrl` to `<AeoAuditSection />`. Auth-gated route falls back to mock when no `siteUrl` is provided.

**To activate fully:** wire `business.website` from the onboarded Business record into the auth-gated page. TODO comment is in `src/app/site-audit/page.tsx`.

## Persisting scan results

**Status:** scan results live in React state only.

**Plan:** Supabase `scans` table keyed on (business_id, url, scanned_at). Lets users re-open prior scans, share permalinks, see trend over time.

## Sentiment summaries

**Status:** mock-derived from synth metrics.

**Files:** `src/features/sentiment/components/SentimentHero.tsx`, `SentimentByPlatform.tsx`, etc.

**To activate:** real per-engine sentiment classifier output on each scan. Same component shapes; swap data source.

## "Ways to take the lead" / CompetitorFixActions LLM playbooks

**Status:** action SELECTION is data-driven; advice prose is hardcoded templates.

**File:** `src/features/competitor-comparison/CompetitorFixActions.tsx`.

**Plan:** wrap the computed inputs (worst engine, gap %, missing prompts) in a Claude API call that writes a fresh playbook per scan. Cache by scan id. Same upgrade applies to WhatsNextCard, NarrativeFeed columns. Bundle them together.

## AI summary in "Ways to take the lead" panel

**Status:** deferred (Joey 2026-05-04). Pattern recommendation: ONE Haiku-4.5 call per scan-id (cached). Synthesize across all gap rows. ~$0.001/load.

**File to touch when ready:** `src/features/competitor-comparison/CompetitorFixActions.tsx`.

## /feedback persistence to Supabase

**Status:** email-only (hits `survengeo@gmail.com`).

**Plan:** Supabase `feedback` table with category / email / message / submitted_at / userId. Archive + future categorization.
