# 10 — AI-Specific Tech (Features 67-72)

The plumbing layer. Features that audit how the page itself is structured to be AI-readable, not just SEO-readable. These are the "GEO infrastructure" diagnostics.

---

## Feature 67 — `llms-full.txt` Generator

**What it does.** Counterpart to feature 15. Generates a single markdown file containing the *full content* of all key pages — designed for LLMs that prefer one large context document.

**Why it matters for GEO.** Mintlify, Stripe, Anthropic and other doc-heavy sites publish llms-full.txt. AI engines (especially when grounded with site context) ingest the whole file. Surven generating it differentiates the offering.

**Technical implementation.**
- Same crawl as feature 15.
- For each key page: extract main text via Mozilla Readability, convert to markdown via `turndown`.
- Concatenate with H1 separators per page + URL header.
- File can get large (1-5MB for 50 pages). Provide both a full and a "essential pages only" version.

**External APIs.** None for assembly. Surven crawl backend.

**Data flow.** Sitemap → crawl → readability → markdown → concatenate → download.

**UI/UX.** Same screen as feature 15. Two download buttons: "llms.txt (nav)" and "llms-full.txt (content)".

**Build complexity.** Small (rolls in with feature 15). ~6-8 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 15.

**Competitor inspiration.** Firecrawl, Mintlify.

---

## Feature 68 — AI Bot Access Audit

**What it does.** Verifies that GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Claude-SearchBot, and Google's AI crawlers can *actually* fetch the page — not just that robots.txt allows them, but that the server doesn't 403/cloudflare-block them.

**Why it matters for GEO.** Many sites have Cloudflare or WAF rules that silently block AI bots even when robots.txt allows them. Discovering this is a "your AI presence is zero because your CDN blocked everyone" finding.

**Technical implementation.**
- Backend makes test requests with each AI bot's user-agent string.
- Compare response codes and content lengths to baseline (Chrome UA).
- Flag: 403, 429, redirect to challenge page, or significantly different body.

**External APIs.** None. Surven backend HTTP requests.

**Data flow.** URL + bot list → backend test fetches → status matrix → side panel.

**UI/UX.** "Bot Access" panel: matrix of bot × status. Red = blocked, yellow = challenged, green = OK. With explanations.

**Build complexity.** Small-Medium. ~10-12 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Surven backend with proxy IP rotation (some sites block known cloud IPs).

**Competitor inspiration.** Dark Visitors (analytics, not active probe). Surven's active probe is novel and high-value.

---

## Feature 69 — Server-Rendered vs JS-Rendered Detector

**What it does.** Determines whether the page's main content is in the initial HTML (server-rendered) or only after JS execution (client-rendered). Critical for AI crawler visibility because most AI bots don't execute JS.

**Why it matters for GEO.** GPTBot, ClaudeBot, PerplexityBot do not execute JavaScript. SPA content is invisible to them. This is a hidden killer of GEO performance for React/Vue/SPAs.

**Technical implementation.**
- Backend fetches page with `User-Agent: GPTBot` and JS disabled (`fetch` directly).
- Extracts visible text and main content elements.
- Compares to the in-browser fully-rendered DOM.
- If text content differs by >40%, flag "JS-rendered, AI-invisible".

**External APIs.** Surven backend.

**Data flow.** URL → backend fetches raw HTML → compare to live DOM → diff stats → side panel.

**UI/UX.** "Render Method" row: "Server-rendered ✓" or "Client-rendered ⚠️ (62% of content invisible to AI bots without JS)". Recommend SSR/SSG/prerendering.

**Build complexity.** Medium. ~14-18 hours.

**Premium-worthiness.** Plus tier (high value detection).

**Dependencies.** Surven backend.

**Competitor inspiration.** Lighthouse "JavaScript Execution Time", Sitebulb "Rendered vs Raw HTML". Critical for GEO; Surven should make it a headline finding.

---

## Feature 70 — Crawl-Blocking JavaScript Flag

**What it does.** Detects specific JS patterns that block crawlers: required client-side authentication, infinite scroll without pagination, content behind interactions (tabs, modals).

**Why it matters for GEO.** Even crawlers that execute JS hit walls. Content behind a "Show more" button or in a modal is rarely indexed by AI.

**Technical implementation.**
- Heuristics:
  - Auth: `<script>` tags referencing auth0/firebase-auth + DOM showing "log in to view".
  - Infinite scroll: presence of `IntersectionObserver` on a content list + no `<a rel="next">`.
  - Hidden content: `display: none` regions with substantial text + interaction triggers.
- Each detected anti-pattern → finding.

**External APIs.** None.

**Data flow.** DOM + script analysis → patterns → findings.

**UI/UX.** "Crawl Blockers" panel with detected anti-patterns + remediation tips.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** None.

**Competitor inspiration.** Sitebulb does some of this. Not common.

---

## Feature 71 — Hreflang Validator

**What it does.** Validates `hreflang` tags for multi-language/region sites. Checks reciprocity, x-default, valid ISO codes.

**Why it matters for GEO.** Multi-region brands lose AI visibility when AI engines pick the wrong locale variant for a query. Hreflang fixes that.

**Technical implementation.**
- Extract `<link rel="alternate" hreflang="...">`.
- Validate codes against ISO-639 + ISO-3166.
- Cross-fetch each alternate URL and verify it returns reciprocal hreflang back to current.

**External APIs.** None.

**Data flow.** Page hreflang → backend reciprocity check → matrix → side panel.

**UI/UX.** "Hreflang" tab visible only when hreflang detected. Reciprocity matrix with red cells for broken pairs.

**Build complexity.** Small-Medium. ~10-12 hours.

**Premium-worthiness.** Plus tier (niche but critical for international brands).

**Dependencies.** Backend cross-fetch.

**Competitor inspiration.** Standard international SEO feature.

---

## Feature 72 — Structured Data Testing Tool Equivalent (In-Browser)

**What it does.** Surven's own client-side equivalent of Google's Rich Results Test. Validates all JSON-LD/Microdata/RDFa on the page against schema.org spec + Google's eligibility rules.

**Why it matters for GEO.** Google retired their Structured Data Testing Tool in 2020 and replaced it with Rich Results Test, which only validates Google-feature-eligible types. Surven's tool validates ALL schema.org types, not just Google-eligible.

**Technical implementation.**
- Use `schemarama` (open-source schema.org validator) — runs in browser via WASM or JS bundle.
- Or use `structured-data-testing-tool` NPM (Node, run via Surven backend).
- Parse all schema on page, validate against spec, return errors/warnings.
- For Google-eligibility, add a layer that runs Google's actual Rich Results Test API (no public API, but Apify has a wrapper).

**External APIs.** None primary. Apify rich-results API as optional add-on.

**Data flow.** Page schema → validator → errors/warnings → side panel.

**UI/UX.** "Schema Validation" tab: per-schema results with field-level errors and warnings. Side-by-side: "Schema.org compliant" + "Google rich-result eligible".

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Schemarama or backend validator.

**Competitor inspiration.** Google Rich Results Test, Schema.org validator, validator.schema.org. Surven differentiator: bundled with the rest of the audit + actionable.

---

## Cross-Cutting Notes

- **AI bot user-agent strings to maintain** (server-side JSON config):
  - `GPTBot/1.2`, `OAI-SearchBot/1.0`, `ChatGPT-User/1.0` — OpenAI
  - `ClaudeBot`, `Claude-SearchBot`, `Claude-User` — Anthropic
  - `PerplexityBot`, `Perplexity-User` — Perplexity (note: Perplexity-User ignores robots.txt)
  - `Google-Extended` — Google AI training opt-out flag
  - `Googlebot/2.1` — search/AIO
  - `CCBot/2.0` — Common Crawl (training data for many)
  - `Bytespider` — ByteDance
  - `Applebot/0.1`, `Applebot-Extended` — Apple Intelligence
  - `cohere-ai`, `Diffbot`, `Amazonbot`
- **Render-method finding** is the single most underestimated audit. SPA sites think they're fine because Google indexes them (Google does execute JS) but they're invisible to all the AI training crawlers. Surface this with a red badge if detected.
- **JS-disabled fetch** must be done server-side; content scripts can't disable JS on a live page meaningfully. Use `fetch` with no rendering as the proxy.
