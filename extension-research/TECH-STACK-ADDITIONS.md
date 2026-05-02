# Tech Stack Additions

What needs to be added to the existing Vite + React + crxjs + MV3 extension and the `surven.vercel.app` backend to ship the 89 features.

## Extension (Client)

### NPM Packages to Add

| Package | Size | Purpose | Features |
|---|---|---|---|
| `wink-nlp` + `wink-eng-lite-web-model` | ~8MB | NER, tokenization, sentence boundary detection | 10, 11, 55, 57, 62 |
| `text-readability` | ~30KB | Flesch-Kincaid + other readability metrics | 54 |
| `@mozilla/readability` | ~25KB | Article main-text extraction | 8, 54, 60, 67 |
| `turndown` | ~10KB | HTML → markdown for llms-full.txt | 67 |
| `fast-xml-parser` | ~30KB | Sitemap XML parsing | 15, 39 |
| `robots-parser` | ~10KB | Robots.txt parsing | 40 |
| `diff-match-patch` | ~15KB | Paragraph-level diff for snapshots | 32, 89 |
| `schemarama` | ~100KB | Client-side schema validation | 14, 72 |
| `recharts` | ~80KB | Charts in side panel | 12, 78, 87 |
| `react-sparklines` | ~5KB | Inline sparklines | 78 |
| `react-router` (or `wouter` for smaller) | 5-30KB | Side panel routing across many tabs | 47+ |
| `web-vitals` | ~5KB | Local CWV measurement | 41 |
| `dompurify` | ~25KB | Sanitize generated HTML before injection | All fix outputs |

**Total extension bundle delta**: ~9MB (mostly winkNLP web model). Lazy-load winkNLP only when entity features are activated.

### Chrome Extension APIs to Use

| API | Already Used? | Purpose |
|---|---|---|
| `chrome.sidePanel` | Yes | Existing UI surface |
| `chrome.scripting` | Yes | Inject content scripts |
| `chrome.storage.local` | Add | Audit history (feature 47), starred findings (48), brand settings (62-66) |
| `chrome.storage.session` | Add | Per-tab cached state |
| `chrome.storage.sync` | Add | User preferences cross-device |
| `chrome.tabs` | Add | Bulk audit (42) |
| `chrome.contextMenus` | Add | Right-click audit/probe (44, 45) |
| `chrome.commands` | Add | Keyboard shortcuts (46) |
| `chrome.action` (badge text/color) | Add | Notification badges (80) |
| `chrome.runtime.connect` (long-lived port) | Add | Side panel ↔ background streaming |
| `chrome.alarms` | Add | Periodic background tasks |
| `chrome.notifications` | Add | OS-level notifications for digest events |
| `chrome.identity` | Add | Surven OAuth |

### Manifest Permissions Required

```json
{
  "permissions": [
    "sidePanel", "storage", "scripting", "tabs",
    "contextMenus", "alarms", "notifications", "identity"
  ],
  "host_permissions": ["<all_urls>"],
  "optional_permissions": ["unlimitedStorage"]
}
```

`unlimitedStorage` lets `chrome.storage.local` exceed 10MB for power users with extensive audit history.

### Build / Tooling Changes

- **Vite config**: enable `rollup-plugin-visualizer` to monitor bundle size. Target <2MB main bundle (excluding lazy-loaded winkNLP).
- **Code splitting**: lazy-load each side-panel tab so initial load stays fast.
- **Web workers**: move winkNLP NER and any heavy regex into a worker to keep the side panel responsive.
- **Shadow DOM library**: consider `lit` or vanilla — for the floating dashboard (77), badge (6), and overlay highlights to avoid host CSS bleed.

## Backend (Surven `surven.vercel.app`)

### New API Endpoints

| Endpoint | Purpose | Features |
|---|---|---|
| `POST /api/ai/proxy` | Fan out to OpenAI/Claude/Gemini/Perplexity | 1, 2, 3, 4, 5, 16, 17, 18, 19, 20, 26, 61 |
| `POST /api/ai/citation-probe` | Specialized citation lookup | 2, 25 |
| `POST /api/audit/url-only` | Headless backend audit | 43, 44 |
| `POST /api/audit/snapshot` | Store audit + return diff | 32 |
| `GET /api/audit/snapshots/:url` | History for a URL | 32, 47, 78 |
| `POST /api/crawl/sitemap` | Crawl sitemap, return URL list | 15, 35, 38, 39, 67 |
| `POST /api/crawl/stale` | Stale content scan | 35 |
| `GET /api/robots/:domain` | Robots.txt analysis | 40 |
| `POST /api/bot-access` | AI bot access probe | 68 |
| `GET /api/render-method` | SSR vs CSR detection | 69 |
| `GET /api/pagespeed/:url` | PSI proxy | 41 |
| `POST /api/embeddings` | Sitemap embedding for competitor matching | 24 |
| `POST /api/compete/match` | Find competitor's equivalent URL | 24 |
| `POST /api/optimizer/tickets` | Send finding to Optimizer | 30 |
| `POST /api/tracker/pages` | Add URL to Tracker monitoring | 33 |
| `GET /api/tracker/citations` | Citation timeline data | 79 |
| `POST /api/share/create` | Create shareable audit link | 53 |
| `POST /api/schedule/audit` | Schedule recurring audit | 51 |
| `POST /api/findings/:id/comments` | Comments on findings | 81 |
| `POST /api/findings/:id/assign` | Assign finding | 82 |
| `PATCH /api/findings/:id/status` | Update finding status | 83 |
| `GET /api/portal/:token` | Public client portal | 84 |
| `GET /api/benchmarks/:category` | Industry benchmarks | 87 |
| `POST /api/goals` | Create improvement goal | 88 |

### New Backend Services / Infra

- **Headless browser pool** (Playwright on Vercel Functions or a separate worker) for features 43, 69. Use `playwright-aws-lambda` or migrate this to a long-running container (Fly.io, Railway).
- **Vector DB** for sitemap embeddings (Pinecone, pgvector in Supabase) — feature 24.
- **Vercel Cron jobs** for scheduled audits (51), leaderboards (28), digest emails (52), goal check-ins (88).
- **Vercel KV (Redis)** for LLM response caching with TTL.
- **Postgres tables** to add: `findings`, `audit_snapshots`, `comments`, `assignments`, `goals`, `scheduled_audits`, `share_tokens`, `shared_brands`, `quota_counters`, `agency_brand_themes`.
- **Webhook receiver** from Optimizer back to extension finding state (verify-fix loop).
- **Rate limiter** middleware per Surven account (use existing rate-limiting infra per CLAUDE.md memory).
- **Audit logging** for enterprise compliance (every finding mutation).

### Third-Party Services to Add

- **Resend** (email) — features 51, 52, 75, 82, 88.
- **Stripe** (already in Surven) — feature 76 upgrades.
- **HubSpot or Customer.io** (CRM/drip) — feature 75.
- **Slack app** (incoming webhooks) — feature 52.
- **SerpAPI account** ($75-275/mo) — features 1 (AIO), 27, 61.
- **OpenAI API account** — features 1, 21, 24 (embeddings).
- **Anthropic API account** — most generation features.
- **Google AI Studio account** — feature 1 Gemini engine.
- **Perplexity Sonar API account** — feature 2.
- **Google Cloud (PageSpeed Insights API key)** — feature 41.

## Existing Stack to Reuse

Per CLAUDE.md, Surven already has:
- Vite + React frontend (extension uses crxjs flavor)
- Vercel deployment
- Supabase (auth + Postgres) — auto-deploy workflow active
- Tracker product (built)
- `/api/audit/run` endpoint (built)
- Surven brand kit (sage/gold/rust palette per `surven-brand-page` skill)

Reuse all of the above. The 89 features layer on top — they don't replace.
