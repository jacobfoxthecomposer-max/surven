# Re-Measurement Loop — Closing the Loop

Detect → fix → re-measure. The third step is what differentiates Surven from every existing GEO tool. Without re-measurement, fixes are claims; with re-measurement, they are evidence.

## Why This Matters

Every competitor stops at the audit. Frase, Surfer, Athena, Profound, Conductor, BrightEdge — all of them tell you what's wrong. None of them prove the fix worked. Surven's pitch is "we will increase your AI mentions by X% in 30 days" and the only way to back that pitch is to measure before, write the fix, wait, and measure after.

## Loop Architecture

```
[Initial scan] ─→ [Fix proposed] ─→ [PR/draft created] ─→ [Approval]
       ↓                                                       ↓
       │                                                  [Merge/publish]
       │                                                       ↓
       │                                              [Deploy verified]
       │                                                       ↓
       │                                          [Wait 24-72h propagation]
       │                                                       ↓
       │                                              [Re-scan triggered]
       │                                                       ↓
       │                                          [Compare metrics → lift report]
       │                                                       ↓
       └───────────── [Adjust strategy if no lift] ←───────────┘
```

## Trigger: Deploy Verified

Re-measurement is triggered by deploy success, not PR merge.

| Platform | Trigger signal |
|----------|----------------|
| GitHub repo + Vercel | `deployment_status` webhook with `state=success`, `environment=Production` |
| GitHub repo + Netlify | Netlify `deploy_succeeded` webhook |
| GitHub repo + Cloudflare | Poll deploy status (no webhook) |
| GitHub repo + GitHub Pages | Wait fixed N minutes after push to default branch |
| WordPress | Verify content immediately re-fetchable via REST |
| Shopify (theme edits) | Theme publish API call returns success |
| Shopify (product/collection) | `productUpdate` returns success |
| Webflow | `site_publish` webhook |
| Headless CMS | Deploy hook called → wait for host deploy success |

## Wait Window

Why wait 24-72 hours before re-scan:
- AI engines re-crawl on their own schedule (varies wildly).
- ChatGPT's web tool tends to refresh within hours; Perplexity within a day; Google AI Overviews within days.
- Crawlers prioritize updated `lastmod` in sitemap — Surven always bumps `lastmod` for changed URLs.
- Aggressive re-measurement (<24h) often shows "no change" simply because the engine hasn't re-indexed yet.

Surven's default wait window per fix tier:
- **Tier 1 (head/schema/llms.txt):** 48 hours.
- **Tier 2 (content rewrites):** 72 hours.
- **Tier 3 (new pages):** 7 days.

Configurable per tenant.

## Re-Scan Scope

Don't re-scan the entire site. Surven re-scans only:
1. The page(s) directly modified by the fix.
2. The site-wide AI presence metrics affected by the fix's expected impact.
3. The specific queries the fix targeted.

Targeted re-scans are 10-100x cheaper than full crawls.

## Metrics Tracked

For each fix, store:

### Before-state metrics (captured at fix proposal)
- Page-level: title, description, schema present, OG tags, word count, last modified.
- Query-level: AI engine citation status (cited/not), citation rank, snippet text.
- Site-level: total pages indexed by GPTBot/ClaudeBot/PerplexityBot (from server logs), llms.txt presence, robots.txt allows.

### After-state metrics (captured post-deploy + wait)
- Same fields as before-state.

### Lift signals
- **Fix verified on page** (binary: did the fix actually appear in production HTML? — first sanity check).
- **Crawler revisited** (boolean: did GPTBot/ClaudeBot/PerplexityBot hit the URL between fix and re-scan? — from server logs if available, else inferred from `If-Modified-Since`).
- **Citation gained / lost** (Surven queries the AI engine for the targeted query and parses citation list).
- **Snippet quality delta** (LLM-judged: is the new snippet more accurate / informative?).
- **Rank delta** (where in citation list does the page now appear?).

## Reporting

### Per-fix Lift Card
```
Fix: Add OG tags to /pricing
Status: Deployed 2026-04-30 14:22 UTC
Re-measured: 2026-05-02 09:00 UTC

Before                After
─────────────────     ─────────────────
OG tags: missing  →   OG tags: present
ChatGPT citation: no → ChatGPT citation: yes (rank 3)
Perplexity citation: yes → Perplexity citation: yes (no change)
GPTBot crawls: 0/wk → 4/wk

Verdict: Positive lift on ChatGPT. No change on Perplexity (already cited).
```

### Per-tenant Monthly Roll-up
- Total fixes shipped.
- Total citations gained (across all engines).
- Total citations lost (regression detection).
- Net lift score (proprietary composite).
- Estimated AI traffic delta (from AI-engine-source UTM tracking if connected).

## When Re-Measurement Shows No Lift

Three categories:
1. **Crawler hasn't revisited yet** → extend wait window, retry.
2. **Fix applied correctly but no citation change** → fix wasn't the bottleneck; other issues remain. Surven proposes the next-most-likely fix.
3. **Fix may have hurt** → automatic rollback offered.

Negative signals trigger an alert in the dashboard, not a silent ignore.

## Crawler Telemetry

The richest signal is server logs showing GPTBot/ClaudeBot/PerplexityBot user agents hitting URLs. Surven offers two integration paths:

### Path A: Log-shipping
Client sends server logs (Cloudflare Logpush, Vercel logs, Netlify analytics) to Surven. Surven parses for AI crawler hits, attributes to fixes.

### Path B: Surven Edge Worker (Cloudflare)
Optional Surven-published Cloudflare Worker the client deploys; logs all AI crawler hits to Surven's API. Bypasses log-shipping complexity. Adds tiny per-request overhead.

### Path C: No telemetry
Surven infers crawler activity from `lastmod` changes in cached AI-engine snippets and from change-over-time in citation behavior. Less precise but works zero-integration.

## Closed-Loop Learning

Across all tenants, Surven aggregates: "for fix X on framework Y, average lift is Z%". This:
- Surfaces "high-leverage" fixes to recommend first.
- Detects regression (a fix that used to work no longer does — engine algorithm changed).
- Powers the "Surven Score" lift estimator shown to prospects.

Privacy: aggregate stats only; no per-tenant data leaks.

## Integration with Surven Dashboard

The dashboard's primary view becomes a "Lift Timeline":
```
[Day 0] Detected 17 issues
[Day 1] Shipped 6 Tier-1 fixes
[Day 3] Re-measured: +4 ChatGPT citations, +1 Perplexity
[Day 4] Shipped 3 Tier-2 fixes (approved)
[Day 7] Re-measured: +2 more citations, +1 rank improvement on top query
[Day 14] Net lift this period: +9 citations, +12% AI-source traffic
```

This is the customer success story. The site-editing engine is plumbing; the lift timeline is the product.

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Re-scan never triggers (deploy event missed) | Daily reconciliation job re-checks all in-flight fixes |
| AI engine API unavailable for re-measurement | Defer; retry next day |
| Citation parsing ambiguous (engine changed snippet format) | Flag for manual review; notify Surven team |
| Lift attribution unclear (multiple fixes shipped same day) | Group by deploy; report aggregate; isolate via staggered deploys when possible |
| Client expectation mismatch ("I shipped, why no lift in 1 hour?") | UX clearly states wait windows |

Cross-references: `13-pr-workflow-and-ux.md` (deploy detection), `14-safety-and-rollback.md` (negative-lift rollback).
