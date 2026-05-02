# Build Roadmap

Sprint-by-sprint plan to ship the 89 features. Sprints are 2 weeks unless noted. Assumes one full-stack engineer; multiply by available headcount.

## Phase 0 — Foundation (1 sprint, ~2 weeks)

Lay the plumbing every feature depends on.

- [ ] Universal `Finding` schema (TS interface + backend Postgres table).
- [ ] Surven OAuth flow in extension (`chrome.identity` + PKCE).
- [ ] Backend `POST /api/ai/proxy` with engine wrappers (OpenAI, Anthropic, Gemini, Perplexity, SerpAPI).
- [ ] Vercel KV cache layer with `(url, prompt, engine, model_version, day)` keys, 24h TTL.
- [ ] Per-account quota counters in Postgres.
- [ ] Side panel router (wouter or React Router) with persisted last-active tab.
- [ ] Bundle size monitoring + code splitting setup.
- [ ] Telemetry stack (PostHog or Plausible) — track every feature invocation.

**Exit criteria**: a single test prompt fans out to 4 engines, returns in <5s, caches, and counts against quota.

## Phase 1 — The Heatmap "Wow" (2 sprints, ~4 weeks)

Ship the visual identity. This is what makes screenshots viral.

- [ ] Feature 6 — Visibility score badge (floating, Shadow DOM)
- [ ] Feature 8 — Color-coded extraction overlay
- [ ] Feature 9 — Per-paragraph quote score with hover breakdown
- [ ] Feature 11 — Answer-capsule detector
- [ ] Feature 12 — Q&A block detector
- [ ] Feature 13 — Schema visibility overlay
- [ ] Feature 22 — Canonical fixer (low-hanging)
- [ ] Feature 39 — Sitemap validator
- [ ] Feature 40 — Robots.txt AI bot analyzer
- [ ] Feature 41 — PageSpeed integration
- [ ] Feature 73 — Demo mode (build `demo.surven.com` first)

**Exit criteria**: a brand-new install lands on demo.surven.com, sees the heatmap render, immediately understands what GEO means visually.

## Phase 2 — The Citation Probe Wedge (2 sprints, ~4 weeks)

The differentiating value. No competitor has this.

- [ ] Feature 1 — Multi-engine prompt simulator (4 engines + Perplexity)
- [ ] Feature 2 — Citation Probe with verbatim quote highlighting
- [ ] Feature 3 — Auto-prompt generator
- [ ] Feature 4 — Engine Diff View
- [ ] Feature 5 — "What would AI quote from this page?"
- [ ] Feature 76 — Quotas/upgrade nudges (so demos respect Free limits)

**Exit criteria**: any prospect's URL gets 8 auto-generated prompts, all 4 engines probed, citations highlighted in-page, all in <30s.

## Phase 3 — One-Click Fixes (2 sprints, ~4 weeks)

Convert insights into shippable artifacts.

- [ ] Feature 14 — JSON-LD schema generator (Article, LocalBusiness, Product, Organization first; FAQ/HowTo/Recipe next)
- [ ] Feature 15 — llms.txt builder
- [ ] Feature 16 — Answer-capsule rewriter
- [ ] Feature 17 — Meta description rewriter
- [ ] Feature 18 — Title rewriter
- [ ] Feature 19 — FAQ block generator
- [ ] Feature 20 — HowTo generator
- [ ] Feature 21 — Alt-text generator
- [ ] Feature 23 — OG/Twitter card generator

**Exit criteria**: a user can audit a page, generate fixes for all detected issues, and copy paste-able HTML/JSON-LD.

## Phase 4 — Tracker / Optimizer Integration (1 sprint, ~2 weeks)

Lock the user into the Surven ecosystem.

- [ ] Feature 30 — "Send to Optimizer" universal CTA
- [ ] Feature 32 — Historical diff (audit snapshots)
- [ ] Feature 33 — Push to Tracker
- [ ] Feature 47 — Audit history sidebar
- [ ] Feature 31 — "Add as client" (agency tier)

**Exit criteria**: every finding has a "Send to Optimizer" button that creates a real ticket in the existing Surven Optimizer workspace.

## Phase 5 — Competitive Intel (2 sprints, ~4 weeks)

The premium-defining moat for paid conversion.

- [ ] Feature 24 — Competitor Compare Mode (sitemap embeddings + matching)
- [ ] Feature 25 — Citation gap matrix
- [ ] Feature 26 — "Steal their schema"
- [ ] Feature 27 — SERP vs AI dual view
- [ ] Feature 28 — Top-of-AI tracker (backend cron + leaderboard tables)
- [ ] Feature 29 — Competitor freshness compare
- [ ] Feature 87 — Industry benchmarks (rolls in with leaderboard data)

**Exit criteria**: pinning a competitor URL adds a synchronized dual-pane view to every audit.

## Phase 6 — Workflow Multipliers (1 sprint, ~2 weeks)

Power user retention.

- [ ] Feature 42 — Bulk-audit open tabs
- [ ] Feature 43 — Audit any URL (backend Playwright)
- [ ] Feature 44 — Right-click audit link
- [ ] Feature 45 — Right-click probe text
- [ ] Feature 46 — Keyboard shortcuts
- [ ] Feature 48 — Pin/star findings
- [ ] Feature 49 — PDF export
- [ ] Feature 50 — CSV export
- [ ] Feature 51 — Scheduled re-audit + cron infrastructure
- [ ] Feature 52 — Slack/email digest
- [ ] Feature 53 — Public shareable link

**Exit criteria**: agency power user runs 30 audits / day without friction.

## Phase 7 — Content Quality + Brand (1 sprint, ~2 weeks)

Depth of analysis.

- [ ] Feature 7 — Brand mention counter
- [ ] Feature 10 — Entity overlay (winkNLP integration)
- [ ] Feature 54 — Reading level
- [ ] Feature 55 — Sentence length
- [ ] Feature 56 — Hedge words
- [ ] Feature 57 — POV consistency
- [ ] Feature 60 — Content depth score
- [ ] Feature 61 — Topic coverage gap
- [ ] Feature 62 — Entity association strength
- [ ] Feature 63 — Co-occurrence
- [ ] Feature 65 — Social proof
- [ ] Feature 66 — E-E-A-T scanner

## Phase 8 — Crawl Depth + AI Tech (1 sprint, ~2 weeks)

- [ ] Feature 34 — Last-modified detector
- [ ] Feature 35 — Stale content scanner
- [ ] Feature 36 — Page age badge
- [ ] Feature 37 — Site-wide crawl trigger
- [ ] Feature 38 — Broken citation finder
- [ ] Feature 58 — Internal link map
- [ ] Feature 59 — External citation map
- [ ] Feature 64 — NAP consistency
- [ ] Feature 67 — llms-full.txt
- [ ] Feature 68 — AI bot access audit
- [ ] Feature 69 — SSR vs CSR detector
- [ ] Feature 70 — Crawl-blocking JS flag
- [ ] Feature 71 — Hreflang
- [ ] Feature 72 — Structured data testing tool

## Phase 9 — Sales / Onboarding / Visualization (1 sprint, ~2 weeks)

- [ ] Feature 75 — Lead capture + drip emails
- [ ] Feature 77 — Floating mini-dashboard
- [ ] Feature 78 — Trend sparklines
- [ ] Feature 79 — Citation source timeline
- [ ] Feature 80 — Notification badges
- [ ] Feature 85 — Best 3 fixes ranking
- [ ] Feature 86 — Lift estimates
- [ ] Feature 88 — Goals + progress
- [ ] Feature 89 — A/B test mode

## Phase 10 — Collaboration + Enterprise (2 sprints, ~4 weeks)

Required for Enterprise tier.

- [ ] Feature 81 — Comments
- [ ] Feature 82 — Assignment
- [ ] Feature 83 — Findings status
- [ ] Feature 74 — White-label
- [ ] Feature 84 — Client portal (entirely new web route)

## Total Timeline Estimate

| Phase | Duration | Cumulative |
|---|---|---|
| 0 — Foundation | 2 wk | 2 wk |
| 1 — Heatmap | 4 wk | 6 wk |
| 2 — Citation Probe | 4 wk | 10 wk |
| 3 — One-Click Fixes | 4 wk | 14 wk |
| 4 — Integration | 2 wk | 16 wk |
| 5 — Competitive | 4 wk | 20 wk |
| 6 — Workflow | 2 wk | 22 wk |
| 7 — Content/Brand | 2 wk | 24 wk |
| 8 — Crawl/AI Tech | 2 wk | 26 wk |
| 9 — Sales/Viz | 2 wk | 28 wk |
| 10 — Collab/Enterprise | 4 wk | 32 wk |

**~32 weeks (8 months) for one full-stack engineer to ship all 89 features.** Realistic with two engineers in 4-5 months. With Joey on backend and you on frontend, ~5 months.

## Launch Strategy

- **Public beta after Phase 2 (10 weeks)**: heatmap + citation probe is enough to take public. Gate the rest behind paid waitlist.
- **Free → Plus paid launch after Phase 4 (16 weeks)**: integration is what justifies money.
- **Premium tier launch after Phase 5 (20 weeks)**: competitive intel makes Premium worth $199.
- **Enterprise launch after Phase 10 (32 weeks)**: white-label + portal complete the agency story.

## Risk Register

- **API cost overruns** — Phase 2 (citation probe) is the single biggest cost driver. Cache aggressively from day one.
- **winkNLP web model size (~5MB)** — could hurt extension install size. Lazy-load only when entity features are first used.
- **Headless browser pool latency** (Phase 6, feature 43) — Vercel Functions have 60s timeout. May need to migrate to Fly.io / Railway for sustained Playwright workloads.
- **Schema mapping accuracy** (Phase 1, feature 13) — DOM mapping is fiddly. Plan for iterative refinement; ship "best effort" first.
- **Google PageSpeed quota** — 25k/day free is enough for thousands of users; monitor.
- **Chrome Web Store review delays** — submit early; first publication can take 1-3 weeks. Subsequent updates are faster.

## Success Metrics

Track per phase:
- **Phase 1**: install → first audit conversion (target >70%).
- **Phase 2**: free → email capture (target >35%).
- **Phase 4**: Plus → Premium upgrade rate (target >15% within 60 days).
- **Phase 5**: weekly active rate of competitor-mode users (target >60%).
- **All phases**: NPS at 60-day mark (target >50).
