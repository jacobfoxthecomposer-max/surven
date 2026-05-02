# 04 — Competitive Intel (Features 24-29)

Agencies and in-house GEO teams care about one thing more than their own visibility: their competitors'. This tier turns the extension into a side-by-side weapon.

---

## Feature 24 — Competitor Compare Mode

**What it does.** User pins a competitor URL/domain in settings. Every page they audit shows two scores side-by-side: their client + the competitor's equivalent page (auto-discovered). Heatmap, schema, citation probe — all dual-rendered.

**Why it matters for GEO.** Reframes every audit from "are we good?" to "are we better?" Competitive context drives action. Without it, scores feel academic.

**Technical implementation.**
- Settings UI: "Track competitor: [domain.com]" (multiple allowed, max 3 on Plus, 10 on Premium).
- Equivalent-page discovery: when user audits `client.com/pricing`, extension queries Surven backend `/api/compete/match?own=client.com/pricing&competitor=competitor.com` which:
  1. Tries direct path match (`competitor.com/pricing`).
  2. Falls back to embedding similarity over competitor's sitemap (use OpenAI `text-embedding-3-small`, $0.02/M tokens — pre-embed competitor sitemaps once weekly).
  3. Returns top 3 matches with similarity scores.
- For the matched competitor URL, run the same audit pipeline (heatmap, score, schema check) server-side and return JSON.
- Render dual-pane in side panel.

**External APIs.** OpenAI embeddings ($0.02/M tokens, ~$0.001 per sitemap). Surven's existing crawl backend.

**Data flow.** Client URL → backend matches competitor URL → backend audits both → side panel dual-pane.

**UI/UX.** Side panel: vertical split. Left = client (your site), right = competitor. Synchronized scrolling on score breakdowns. Header shows "Acme vs. Competitor X — Score 67 vs. 82 (-15)".

**Build complexity.** Large. ~40-50 hours (sitemap embedding + matching + dual-rendering).

**Premium-worthiness.** Premium-defining. This is what separates a $49 tool from a $199 tool.

**Dependencies.** Feature 8 (heatmap), feature 13 (schema), Surven backend competitor crawl + embedding.

**Competitor inspiration.** Profound and Peec.ai do brand-level competitor tracking. None do per-page side-by-side. ahrefs Site Explorer compares but at domain level. Genuine gap.

---

## Feature 25 — Citation Gap on This Page

**What it does.** For the prompts auto-generated in feature 3 (or user-typed in feature 1), shows: "Competitor X is cited for 6 of 8 prompts; you are cited for 2." Lists specific prompts where the competitor wins.

**Why it matters for GEO.** Concrete, ranked, prioritized list of "prompts you're losing" — directly actionable.

**Technical implementation.**
- Take prompt list from feature 3.
- For each prompt, run citation probe (feature 2) against both client and competitor URLs.
- Aggregate: matrix of `prompt × URL × cited?`.
- Highlight gaps: prompts where competitor cited and client not.
- For each gap, single Sonnet call: "Competitor was cited for prompt X with this quote: '...'. The client's page lacks similar coverage. Suggest 1-2 concrete additions to the client page."

**External APIs.** Whatever Citation Probe uses (Perplexity Sonar primary).

**Data flow.** Prompts × engines × URLs → backend batches probes → gap matrix → Sonnet recommendations → side panel.

**UI/UX.** Tab "Gaps". Table: prompts as rows, "you / competitor" as columns. Cells colored. Click a gap row → expand to show competitor's quote + suggested addition.

**Build complexity.** Medium. ~24-30 hours (sits on top of features 1, 2, 3, 24).

**Premium-worthiness.** Premium.

**Dependencies.** Features 1, 2, 3, 24.

**Competitor inspiration.** Profound's "share of voice gap" is brand-level. None do per-prompt per-page gap with a fix suggestion.

---

## Feature 26 — "Steal Their Schema"

**What it does.** Pulls the competitor's JSON-LD schema from their equivalent page, swaps brand-specific fields with the client's data, returns a ready-to-paste version.

**Why it matters for GEO.** Why reinvent? If a competitor's schema is performing, mirroring its structure (with your data) is a fast win. Slightly cheeky but legitimate — schema isn't copyrighted, structure isn't IP.

**Technical implementation.**
- Backend fetches competitor URL, parses all `<script type="application/ld+json">`.
- Sonnet prompt: "Take this competitor JSON-LD and adapt it for {client brand}. Replace brand-specific identifiers (name, URL, sameAs, image, address, telephone) with the client's. Keep the structural fields (type, properties, nesting). Remove competitor-specific reviews, products, IDs."
- Validate output.

**External APIs.** Sonnet, ~$0.003.

**Data flow.** Competitor URL → backend fetch → Sonnet rewrite → side panel pretty JSON-LD.

**UI/UX.** Button on the dual-pane competitor view: "Steal this schema". Output: side-by-side competitor original vs. adapted, copy button.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Premium. Power-feature with clear ROI.

**Dependencies.** Features 14, 24.

**Competitor inspiration.** None. Genuinely novel and a marketing-friendly headline ("steal their schema").

---

## Feature 27 — SERP vs AI Dual View

**What it does.** For a given prompt, shows side-by-side: traditional Google SERP top-10 (via SerpAPI) and AI engine answers (features 1, 2). Highlights which URLs appear in both, which only in SERPs, which only in AI.

**Why it matters for GEO.** Reveals the AI/SERP divergence — pages ranking #3 organically but never cited by AI, or vice versa. The single biggest insight for prioritization.

**Technical implementation.**
- SerpAPI Google Search query → top 10 organic results with URLs and snippets.
- In parallel, run feature 1 simulator on same prompt → 4 engine answers + cited URLs.
- Backend computes union/intersection of URL sets.
- Render: 2 columns (SERPs left, AI right) + Venn diagram badge ("3 in both, 7 SERP-only, 5 AI-only").

**External APIs.** SerpAPI ($25/1k requests) + LLM costs from feature 1.

**Data flow.** Prompt → SerpAPI + simulator → backend merges → side panel.

**UI/UX.** Tab "SERP vs AI". Side-by-side ranked lists with link colors: green = appears in both, blue = SERP only, purple = AI only.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 1, SerpAPI.

**Competitor inspiration.** Some enterprise SEO tools (BrightEdge, Conductor) have AIO tracking but not the side-by-side SERP comparison. Athena and Profound focus on AI-only.

---

## Feature 28 — Top-of-AI Tracker

**What it does.** Background job (server-side, scheduled) that fires a category's top prompts daily and tracks who appears first/most. Surfaced in extension as a leaderboard for the current page's category.

**Why it matters for GEO.** Industry-level visibility benchmarking. "In 'CRM software for agencies' prompts, you're cited 12% of the time, HubSpot is 47%."

**Technical implementation.**
- Extension classifies the current page's category (via Sonnet, e.g. "B2B SaaS / CRM").
- Backend has a precomputed leaderboard per category, refreshed daily by scheduled Vercel cron.
- Each leaderboard run: 10 top prompts × 4 engines, parse cited URLs, attribute to brands (domain → brand mapping table maintained per Surven account).
- Extension displays the leaderboard for the current page's category.

**External APIs.** All 4 engines + Perplexity, run daily. Cost ~$0.50/category/day. With 50 categories tracked: ~$25/day = $750/mo. Bake into Premium pricing.

**Data flow.** Backend cron → daily aggregation → cached leaderboard table → extension reads → side panel.

**UI/UX.** Side panel "Leaderboard" tab. Category badge at top. Bar chart: top 10 brands by share-of-citation. Trend sparkline per brand (30 days).

**Build complexity.** Large. ~50-60 hours including the backend cron infrastructure.

**Premium-worthiness.** Premium-defining. Also a recurring email digest opportunity (feature 52).

**Dependencies.** Backend cron infra, brand-domain mapping, feature 1.

**Competitor inspiration.** Profound, Peec.ai, Athena all do this — it's table stakes for premium GEO platforms. We need parity.

---

## Feature 29 — Competitor Freshness Compare

**What it does.** Compares "last modified" date and content-update cadence of the client's vs competitor's equivalent pages. Flags pages where competitor updated recently and client hasn't.

**Why it matters for GEO.** AI engines bias toward fresh content. A page that hasn't been touched in 2 years is at a structural disadvantage to a competitor's monthly-refreshed page.

**Technical implementation.**
- Last-modified extraction: HTTP header `Last-Modified`, `<meta property="article:modified_time">`, `dateModified` in JSON-LD, sitemap `<lastmod>`.
- Run on both client and competitor pages (feature 24's matched URL).
- Compute deltas: "Competitor updated 12 days ago, you updated 487 days ago".
- Cadence inference: from sitemap history (if archive available) or from Wayback Machine API (free).

**External APIs.** Wayback Machine CDX API (free, rate-limited).

**Data flow.** Both URLs → header + meta extraction → side panel comparison + delta.

**UI/UX.** Card on the dual-pane: "Freshness: ⚠️ Competitor updated 12 days ago. You updated 487 days ago." with action button "Schedule re-audit weekly" (feature 51).

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 24, feature 34.

**Competitor inspiration.** Some content monitoring tools (Visualping, Distill) track changes. None compare to competitors specifically for GEO.

---

## Cross-Cutting Notes

- **Competitor data privacy**. Anything pulled from competitor pages is publicly available, but Surven should never display competitors' private analytics or attempt authenticated access. Stay on the right side of the line.
- **Domain-brand mapping table**. Maintain server-side. Critical for leaderboard accuracy because URLs cited by AI need to be aggregated to a brand. Seed with top 1000 brands per category, let users add custom mappings.
- **Caching strategy**. Competitor audits should cache for 7 days unless the user explicitly forces refresh. Keeps costs predictable.
- **Surven internal use**. The Tracker (Surven's existing product) likely has a brand-mapping table already — wire the extension to read from it rather than duplicate.
