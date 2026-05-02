# 06 — Crawl & Freshness (Features 34-41)

Foundation tier. These are unsexy but make the extension trustworthy as a real audit tool. They also feed signals into the heatmap score.

---

## Feature 34 — Last-Modified Detector

**What it does.** Reports the page's last-modified date from multiple sources (HTTP header, meta tags, JSON-LD `dateModified`, sitemap `<lastmod>`, visible page byline). Reconciles conflicts.

**Why it matters for GEO.** Freshness signal for AI engines. Also reveals stale schema (e.g., article published 2019 with no modified date).

**Technical implementation.**
- Content script reads: `<meta property="article:modified_time">`, `<meta property="og:updated_time">`, `<time datetime>` near byline.
- Background fetches HEAD request for `Last-Modified` header (use `fetch(url, {method: 'HEAD'})` from background — content scripts can't bypass CORS).
- Background fetches `/sitemap.xml`, parses, finds matching URL's `<lastmod>`.
- Reconciliation: report all sources + flag mismatches.

**External APIs.** None.

**Data flow.** Page + headers + sitemap → reconciled date → side panel.

**UI/UX.** "Freshness" row: "Last modified: 12 days ago (HTTP), 14 months ago (JSON-LD) ⚠️ mismatch — fix JSON-LD dateModified".

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** None.

**Competitor inspiration.** Standard SEO tool feature.

---

## Feature 35 — Stale Content Scanner (>90 Days)

**What it does.** Site-wide crawl that flags every page modified >90 days ago, ranked by importance (traffic, link count from internal pages).

**Why it matters for GEO.** Surfaces the "graveyard" — pages quietly costing visibility. Enables a "refresh sprint" workload for the Optimizer team.

**Technical implementation.**
- Backend `/api/audit/stale?domain=...&threshold=90`.
- Crawls sitemap.
- For each URL, runs HEAD + meta extraction for last-modified.
- Optional: pulls page importance from internal-link graph (count inbound internal links via crawl).
- Returns ranked list.

**External APIs.** None.

**Data flow.** Domain → backend crawl → list of stale URLs → side panel/dashboard.

**UI/UX.** "Stale Content" tab. Sortable table: URL, last modified, days stale, internal links, action (Send all top-10 to Optimizer).

**Build complexity.** Medium. ~16-20 hours (rolls in with existing Surven crawl infra).

**Premium-worthiness.** Premium.

**Dependencies.** Surven crawl backend.

**Competitor inspiration.** Frase has Content Opportunities. ahrefs has Content Decay reports. Standard pattern.

---

## Feature 36 — Page Age Badge

**What it does.** Inline badge in the floating mini-dashboard (feature 6) showing the current page's age + freshness color (sage = <30d, gold = 30-90d, rust = >90d).

**Why it matters for GEO.** Ambient awareness on every page browsed.

**Technical implementation.**
- Reuses feature 34's date extraction.
- Adds a colored chip to the badge.

**External APIs.** None.

**Build complexity.** Small. ~3 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Features 6, 34.

**Competitor inspiration.** None as a browser badge.

---

## Feature 37 — Site-Wide Crawl Trigger

**What it does.** "Crawl entire site" button that triggers Surven backend's existing `/api/audit/run` (full 100-page crawl) from the extension. Returns when complete; results browsable in side panel.

**Why it matters for GEO.** Extension shifts from per-page tool to full-site auditor without leaving the browser.

**Technical implementation.**
- Button → POST to existing endpoint with current domain.
- Stream progress via SSE (existing endpoint should support).
- Results: per-page scores in a table, click row → opens that page in a new tab with extension auto-auditing it.

**External APIs.** Surven backend (exists).

**Data flow.** Button → backend job → SSE progress → results table → click → audit-on-load.

**UI/UX.** "Crawl entire site" button at top of side panel. Modal with domain confirmation, page-cap selector (10/50/100). Progress bar. Results table on completion.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Premium (full crawls cost real backend resources).

**Dependencies.** Existing Surven crawl endpoint.

**Competitor inspiration.** Screaming Frog browser plugin, ahrefs Webmaster Tools. Surven's differentiator: GEO scoring per page, not generic SEO.

---

## Feature 38 — Broken Citation Finder

**What it does.** Crawls the site and finds all outbound links/citations that 404 or redirect chain. Specifically targets links that AI engines might follow.

**Why it matters for GEO.** Broken outbound citations weaken the page as a source. AI engines penalize pages with dead links because they can't validate facts.

**Technical implementation.**
- Site crawl extracts all `<a href>` outbound links.
- HEAD request each (with concurrency limit, ~10 parallel, ~500ms timeout).
- Categorize: 200, 3xx, 404, 5xx, timeout, blocked.

**External APIs.** None.

**Data flow.** Site crawl → outbound link list → batch HEAD → status table.

**UI/UX.** "Broken Citations" tab. Table grouped by status. Per-page rollup ("Page X has 3 broken outbound links").

**Build complexity.** Small-Medium. ~12-16 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Site crawl backend.

**Competitor inspiration.** Standard SEO tool feature; Screaming Frog is the gold standard.

---

## Feature 39 — Sitemap Validator

**What it does.** Fetches `/sitemap.xml` (and `/sitemap_index.xml`), validates per protocol, flags issues: malformed XML, URLs returning non-200, URLs with mismatched canonicals, missing priority/changefreq, sitemap >50MB or >50k URLs.

**Why it matters for GEO.** AI crawlers (GPTBot, ClaudeBot, PerplexityBot) primarily discover pages via sitemap. A broken sitemap = pages invisible to AI.

**Technical implementation.**
- Backend fetches and parses (use `fast-xml-parser`).
- Validation rules per sitemaps.org spec.
- Sample 50 URLs and HEAD-check them.

**External APIs.** None.

**Data flow.** Domain → backend fetches sitemap → validates → results.

**UI/UX.** "Sitemap" tab with health summary + issues list.

**Build complexity.** Small. ~8 hours.

**Premium-worthiness.** Free tier (use as a hook).

**Dependencies.** Backend.

**Competitor inspiration.** Standard SEO tool feature.

---

## Feature 40 — Robots.txt Analyzer (GPTBot, ClaudeBot, etc.)

**What it does.** Fetches `/robots.txt` and reports: which AI crawlers are allowed/disallowed, whether the directives are syntactically correct, and recommendations (e.g., "you're blocking ClaudeBot — this prevents Claude from citing you").

**Why it matters for GEO.** Many sites accidentally block AI crawlers. Many block them deliberately (training-data fear) without realizing they also block citation-time crawlers. Surven needs to tell them which is which.

**Technical implementation.**
- Backend fetches robots.txt.
- Parse with `robots-parser` (NPM).
- Check against curated list of AI user-agents:
  ```
  GPTBot, OAI-SearchBot, ChatGPT-User      # OpenAI (training, search, on-demand)
  ClaudeBot, Claude-SearchBot, Claude-User # Anthropic
  PerplexityBot, Perplexity-User           # Perplexity (Perplexity-User ignores robots.txt)
  Google-Extended                          # Google AI training opt-out
  Googlebot                                # Google search (powers AIO)
  CCBot                                    # Common Crawl (training data)
  Bytespider                               # ByteDance / Doubao
  Applebot, Applebot-Extended              # Apple Intelligence
  cohere-ai                                # Cohere
  Diffbot                                  # Diffbot crawl
  ```
- Report status per bot with explanations.

**External APIs.** None.

**Data flow.** Domain → backend fetch → parser → status matrix → side panel.

**UI/UX.** Tab "AI Crawlers". Table: bot, allowed?, training/search distinction, recommendation. "Generate fixed robots.txt" button.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Free tier (high value for hook).

**Dependencies.** Backend.

**Competitor inspiration.** Dark Visitors, Spawning.ai do AI bot tracking. Surven's angle: actionable + integrated with the rest of the audit.

---

## Feature 41 — Page Speed Score (Core Web Vitals)

**What it does.** Reports LCP, INP, CLS for the current page using PageSpeed Insights API. Includes "field data" (real users) and "lab data" (Lighthouse).

**Why it matters for GEO.** Core Web Vitals are a direct ranking signal for Google (which feeds AIO). Slow pages get crawled less by AI bots.

**Technical implementation.**
- Backend calls Google PageSpeed Insights API: `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile&key=...` (free tier: 25k/day with API key).
- Parse `lighthouseResult.audits` for LCP/INP/CLS.
- Optionally: in-browser real-user CWV via `web-vitals` NPM package (no server needed) for the user's own session — useful for local dev contexts.

**External APIs.** Google PageSpeed Insights API (free, 25k/day). Backup: `web-vitals` NPM (free, local).

**Data flow.** URL → PSI API → metrics → side panel + heatmap score contribution.

**UI/UX.** "Performance" row: LCP / INP / CLS with sage/gold/rust thresholds + Google's official thresholds inline.

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Google API key in Surven backend.

**Competitor inspiration.** Lighthouse browser extension is the gold standard. PageSpeed Insights for Chrome. Surven's angle: bundled with GEO context, not standalone.

---

## Cross-Cutting Notes

- **Crawl backend reuse.** All site-wide features (35, 37, 38, 39) share Surven's existing `/api/audit/run` infra. Don't build a parallel crawler.
- **Freshness signal weight.** In feature 8's score formula, freshness should be 10-15 pts max. Don't let it dominate — a 5-year-old great page can outrank a fresh weak one.
- **Caching robots.txt and sitemap**. 24h cache per domain. They rarely change.
- **Bot list maintenance**. Maintain the AI user-agent list server-side as a JSON file. New bots emerge monthly (Apple Intelligence in 2024, Doubao in 2025).
