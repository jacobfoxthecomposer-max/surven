# Surven Auditor Chrome Extension — Feature Research

This directory is the implementation roadmap for upgrading the Surven Auditor Chrome Extension from a basic findings-list tool into a **GEO power tool clients pay $199/mo for**.

## How to Use This Research

Each per-category file covers a tranche of features using a 10-point template:
1. What it does
2. Why it matters for GEO
3. Technical implementation
4. External APIs / services needed
5. Data flow
6. UI/UX recommendations
7. Build complexity (S/M/L + hours)
8. Premium-worthiness
9. Dependencies
10. Competitor inspiration

## File Index

### Great Tier (premium-defining, build first)
- [01 — Live AI Visibility](./01-live-ai-visibility.md) — Multi-engine prompt simulator, citation probe, engine diff
- [02 — AI Extraction Heatmap](./02-extraction-heatmap.md) — Color-coded overlays scoring each paragraph for AI-extractability
- [03 — One-Click Fixes](./03-one-click-fixes.md) — JSON-LD generators, llms.txt, capsule rewriter
- [04 — Competitive Intel](./04-competitive-intel.md) — Compare mode, citation gap, "steal their schema"
- [05 — Tracker + Optimizer Integration](./05-tracker-optimizer-integration.md) — Send findings to Surven backend

### Good Tier (roadmap)
- [06 — Crawl & Freshness](./06-crawl-and-freshness.md) — Last-modified, stale content, sitemap, robots.txt
- [07 — Workflow Multipliers](./07-workflow-multipliers.md) — Bulk audit, right-click, history, exports
- [08 — Content Analysis](./08-content-analysis.md) — Readability, hedge-words, link maps
- [09 — Brand & Entity](./09-brand-and-entity.md) — Entity strength, NAP, E-E-A-T
- [10 — AI-Specific Tech](./10-ai-specific-tech.md) — llms-full.txt, bot access audit, JS rendering
- [11 — Sales & Onboarding](./11-sales-and-onboarding.md) — Demo mode, white-label, lead capture
- [12 — Visualization](./12-visualization.md) — Mini-dashboard, sparklines, badges
- [13 — Collaboration](./13-collaboration.md) — Comments, assignment, status, client portal
- [14 — Optimization Suggestions](./14-optimization-suggestions.md) — Best 3 fixes, lift estimates, benchmarks

### Cross-Cutting References
- [APIS-AND-COSTS.md](./APIS-AND-COSTS.md) — Every external API with pricing
- [TECH-STACK-ADDITIONS.md](./TECH-STACK-ADDITIONS.md) — NPM packages, Chrome APIs, services
- [PREMIUM-TIERING.md](./PREMIUM-TIERING.md) — Free / Plus / Premium feature matrix
- [BUILD-ROADMAP.md](./BUILD-ROADMAP.md) — Sprint-by-sprint plan

## Recommended Build Order (TL;DR)

1. **Sprint 1 (2 wks)** — Heatmap overlay + Citation Probe (features 8-13, 2). These sell the extension on first run.
2. **Sprint 2 (2 wks)** — One-click fixes for schema + capsule rewriter (14, 16, 19). Converts insight → action.
3. **Sprint 3 (2 wks)** — Multi-engine simulator + auto-prompt generator (1, 3). The "wow" moment for demos.
4. **Sprint 4 (1 wk)** — Tracker/Optimizer integration (30-33). Locks the user into Surven.
5. **Sprint 5+** — Competitive intel, workflow, then good-tier polish.

See [BUILD-ROADMAP.md](./BUILD-ROADMAP.md) for full detail.

## Top Strategic Findings

1. **Citation Probe is the killer feature.** No competitor (Profound, Peec, Otterly, Athena) gives you a per-URL "are you cited right now, with the verbatim quote" — they all work at the *brand/prompt* level, not the *page* level. This is Surven's wedge.
2. **The 40-60 word answer capsule** is the most well-supported GEO heuristic in current research (72% of ChatGPT-cited pages have one in the first 40-60 words). Build the heatmap around this number.
3. **API costs are dominated by the simulator, not the heatmap.** A multi-engine prompt costs ~$0.01-0.05 per fire across 4 engines. The heatmap can run locally for free with `winkNLP` + a single Haiku call.
4. **Perplexity Sonar is the cheapest "AI search" probe** ($1/M tokens + $5-12/1k requests) and the only one that returns actual citation URLs as structured data — use it as your default citation backend.
5. **llms.txt is now a real spec** with Yoast, Mintlify, and Firecrawl all auto-generating. Surven generating one client-side from a sitemap is trivially differentiating vs. paying for a separate tool.

## Conventions Used in These Docs

- **Build complexity hours** assume one experienced full-stack dev, no UI polish — multiply ×1.5 for production polish.
- **Tier recommendation** assumes Free = lead-gen, Plus ($49) = solo operator, Premium ($199) = agency.
- **API costs** quoted at retail rates as of May 2026 — see [APIS-AND-COSTS.md](./APIS-AND-COSTS.md).
- All file paths in code snippets are relative to `/extension/src/`.
