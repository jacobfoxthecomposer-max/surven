# APIs and Costs (May 2026)

Consolidated reference for every external service across all 89 features. Pricing is per-call/per-token retail unless noted. All keys live in Surven backend env vars; the extension never holds a key.

## LLM Providers

| Provider / Model | Input ($/M tok) | Output ($/M tok) | Notes |
|---|---|---|---|
| OpenAI GPT-4o | $2.50 | $10.00 | High quality, vision-capable. Use for premium tasks. |
| OpenAI GPT-4o-mini | $0.15 | $0.60 | **Best vision price** — use for alt-text (feature 21). |
| OpenAI GPT-4.1 | $2.00 | $8.00 | Updated reasoning option. |
| OpenAI GPT-5 | $1.25 | $10.00 | New flagship as of late 2025. |
| Anthropic Claude Haiku 4.5 | $1.00 | $5.00 | **Default for cheap structured outputs** (features 3, 14 detect, 17, 18). |
| Anthropic Claude Sonnet 4.6 | $3.00 | $15.00 | **Default for generation/reasoning** (features 4, 5, 14 generate, 16, 19, 20). |
| Anthropic Claude Opus 4.7 | $5.00 | $25.00 | Reserve for highest-stakes (engine diff arbitration only). |
| Google Gemini 3 Flash Preview | $0.50 | $3.00 | Use as a 4th-engine simulator option in feature 1. |
| Google Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Cheapest. Use for high-volume background jobs. |
| Google Gemini 3 Pro Preview | $2.00 | $12.00 | High quality option. |
| Google Gemini 2.5 Pro | $1.25 | $10.00 | |
| Perplexity Sonar | $1/M tok | $1/M tok | + $5-12/1k requests. **Primary citation backend for feature 2** — only engine returning structured citation URLs natively. |
| Perplexity Sonar Pro | $3/M tok | $15/M tok | + $6-14/1k requests. |

**Rules of thumb.**
- Cheap classification / extraction → Haiku 4.5 or Gemini Flash-Lite (~$0.001 per call).
- Generation (rewriting, schema gen) → Sonnet 4.6 (~$0.003-0.01 per call).
- Citation queries with grounding → Perplexity Sonar (~$0.01 per call).
- Vision (alt-text) → GPT-4o-mini (~$0.001 per image).
- Avoid Opus unless you need the marginal quality.

**Prompt caching reduces cached input by 90%** on Anthropic. Cache the static system prompt for every Surven prompt template — saves ~$50/mo at moderate volume.

**Batch processing halves all token costs** on Anthropic and OpenAI. Use for nightly leaderboard runs (feature 28).

## Search / SERP

| Provider | Pricing | Notes |
|---|---|---|
| SerpAPI | $25/1k requests, $75 dev tier (5k/$75) | **Best AIO detection** (68% in 2026 benchmarks). Returns structured AIO references[]. |
| Scrape.do | ~$1.16/1k | 21× cheaper than SerpAPI, similar richness — viable backup. |
| Serper | $0.30/1k (cheapest paid SERP) | Good for high-volume, lower AIO detection. |
| SearchAPI | ~$5-15/1k tiered | Mid-market alternative. |

**Recommendation**: Use SerpAPI for AIO-heavy queries (features 1's AIO engine, 27, 61). Use Scrape.do for high-volume background SERP scraping (feature 28 leaderboard). Build the SerpAPI wrapper first, swap providers behind it later.

## Web Performance

| Provider | Pricing | Notes |
|---|---|---|
| Google PageSpeed Insights API | Free, 25k/day with key | Use for feature 41. |
| Google CrUX API | Free, rate-limited | Real-user CWV data. |
| `web-vitals` NPM | Free | Local in-browser measurement. |

## Schema Validation

| Provider | Pricing | Notes |
|---|---|---|
| schema.org validator | Free, rate-limited | Public endpoint. |
| Apify Rich Results Tester | $0.10/1k via Apify credits | Wraps Google's RRT. |
| `schemarama` (NPM) | Free, OSS | Run locally. |

## Email / Notifications

| Provider | Pricing | Notes |
|---|---|---|
| Resend | $20/mo for 50k emails | Recommended. Surven likely already uses. |
| Postmark | $15/mo for 10k | Alt. |
| Slack incoming webhooks | Free | For feature 52 digest. |

## Storage / Data

| Provider | Pricing | Notes |
|---|---|---|
| Vercel KV (Redis) | $1/100k requests, $0.30/100k commands | For caching LLM responses. |
| Vercel Postgres | $20/mo (Pro tier) | For findings/audit history. |
| Supabase | Existing in Surven stack | Use what's there per CLAUDE.md. |

## Optional / Premium Add-Ons

| Provider | Pricing | Use |
|---|---|---|
| Ahrefs API | $500+/mo | Domain authority for feature 59. Skip — use heuristics. |
| Moz Links API | $250+/mo | Same. Skip. |
| BrightLocal API | ~$30/loc/mo | Feature 64 NAP check. |
| Synup API | TBD per quote | Feature 64 alt. |
| Google Places API | $17/1k Place Details | Feature 64. |
| HubSpot CRM | Free tier OK | Feature 75 lead capture. Or Customer.io. |
| Stripe | 2.9% + $0.30 | Subscriptions. Existing in Surven. |
| Wayback Machine CDX | Free, rate-limited | Feature 29 freshness history. |

## Estimated Per-Audit Cost (Premium User)

For a single page audit running the full premium pipeline:

- Heatmap (local) — $0
- Schema visibility (local) — $0
- Auto-prompts (Haiku) — $0.001
- Multi-engine simulator (4 engines + Perplexity) — $0.03
- Citation probe (Perplexity primary) — $0.012
- Engine diff (Sonnet) — $0.005
- "What would AI quote" (Sonnet) — $0.01
- Schema generation (Sonnet) — $0.01
- Capsule rewriter (Sonnet, ×3 paragraphs) — $0.009
- Alt-text generator (GPT-4o-mini, ×5 images) — $0.005
- PageSpeed Insights — $0
- Bot access audit (backend) — $0
- **Total per full audit: ~$0.08**

At Premium price ($199/mo) and a 30× margin target, that's a soft cap of ~80 full audits per user per month before margins compress. Build the soft cap into quotas (feature 76) accordingly.

## Cost Containment Tactics

1. **Cache aggressively**. Vercel KV with 24h TTL keyed on `(url, prompt, engine, model_version)`. Drops cost 70-90% for agencies who probe the same URLs repeatedly.
2. **Prompt cache the system prompt**. ~$50/mo saved at moderate volume.
3. **Batch background jobs**. Leaderboards (feature 28), scheduled re-audits (feature 51) → use OpenAI/Anthropic Batch API for 50% discount.
4. **Default to Haiku and Gemini Flash-Lite for low-stakes calls**. Reserve Sonnet+ for premium-tier features.
5. **Local-first**. Heatmap (feature 8), entity overlay (10), readability (54), hedge words (56) all run in the content script with no API costs.
