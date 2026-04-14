# Surven — GEO Marketing Platform

## What It Is

Surven is a **Generative Engine Optimization (GEO)** SaaS platform that helps businesses track whether they appear in AI-generated answers from ChatGPT, Claude, Gemini, and Google Search AI Overviews. Think of it as SEO rank tracking, but for AI search.

## Status: Live on Vercel ✅

All phases below are built and deployed.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.2 (React 19) + TypeScript |
| Styling | Tailwind CSS + CSS variables, dark mode (class strategy) |
| Animation | Framer Motion + React Spring (SVG gauge) + Three.js (WebGL shader) |
| Charts | Recharts (dark mode friendly, accessible) |
| Forms | React Hook Form + Zod |
| Auth / DB | Supabase (PostgreSQL + Auth) |
| Server state | TanStack Query |
| Icons | Lucide React |

## Design System

**Color palette (dark premium):**
- Background: `#0f172a` (deep navy)
- Primary: `#4361ee` (electric blue)
- Accent: `#06d6a0` (teal)
- Text: `#f1f5f9` (off-white)

**Typography:** Inter, 16px base, 1.5 line-height

**Animation rules:** 150–300ms micros, 300–400ms transitions, 600–1200ms charts. Animate transform/opacity only. Always respect `prefers-reduced-motion`.

## Architecture Decisions

1. **Container/Presentational** component split
2. **Custom hooks** own data logic: `useAuth`, `useScan`, `useBusiness`, `useActiveBusiness`
3. **Feature-based folder structure** (not by file type)
4. **Mock scan engine** as isolated module — no AI API keys required
5. **ActiveBusinessContext** stores active business ID in localStorage for multi-client support
6. **Service role key** used server-side (cron) to bypass RLS; anon key used client-side

## Database Tables

- `businesses` — user_id, name, industry, city, state
- `competitors` — business_id, name
- `search_prompts` — business_id, prompt_text, active
- `scans` — business_id, visibility_score, scan_type (manual|automated), model_scores (JSONB)
- `scan_results` — scan_id, prompt_text, model_name, response_text, business_mentioned, competitor_mentions (JSONB), sentiment (TEXT), citations (JSONB)

## Phase 1 Features ✅

### Search Prompt Monitoring
- Custom prompts table + `useSearchPrompts` hook
- `PromptsTab.tsx` in Settings — add/delete custom prompts
- Merged with 6 default templates on every scan

### Brand Visibility Tracking
- `model_scores JSONB` on scans — per-model scores stored and charted
- `HistoryChart.tsx` — overall + per-model dashed trend lines

### Weekly Automated Scans
- `vercel.json` cron: `0 9 * * 1` (Monday 9am UTC)
- `/api/cron/scan` — verifies `CRON_SECRET` header, scans all businesses
- `scan_type` badge on dashboard ("Auto" vs manual)

### CSV Export
- Client-side Blob download via `csvExport.ts`
- Includes: prompt, model, mentioned, competitor columns, response text

## Phase 2 Features ✅

### Sentiment Analysis
- `sentiment` column on scan_results (positive | neutral | negative)
- `analyzeSentiment()` in `/api/scan` — Claude Haiku, max_tokens: 5
- `SentimentSection.tsx` — animated bars + dominant tone label
- Mock engine uses deterministic hash-based sentiment

### Citation Gap Analysis
- `citations JSONB` column on scan_results
- `extractCitations()` pulls domains from AI response URLs
- `CitationGapSection.tsx` — top 10 domains with Listed (green) / Gap (red) badges
- Mock engine generates realistic fake citation domains

### Competitor Benchmarking
- `CompetitorBenchmarkSection.tsx` — per-competitor cards with per-model head-to-head bars
- Delta badges (+/- %) with trending arrows
- Sits below existing `ComparisonSection` bar chart overview

### Multi-client Workspaces
- `ActiveBusinessContext` (`useActiveBusiness.tsx`) — stores active ID in localStorage
- `BusinessSwitcher.tsx` — dropdown in header next to logo
- `/onboarding/new/page.tsx` — add new business form
- Delete business cascades: scan_results → scans → search_prompts → competitors → business
- Settings → Business always reflects the currently active business

## Dashboard Section Order

1. Run New Scan (Visibility Gauge)
2. AI Model Breakdown
3. Brand Sentiment
4. Prompt Results
5. Competitor Comparison
6. Competitor Benchmarking
7. Citation Gap Analysis
8. Visibility Over Time
9. Export CSV

## Animation Work ✅ (completed 2026-04-09)

### Landing Page
- **HeroSection.tsx** — Full-screen hero with ShaderAnimation (THREE.js WebGL) as fixed background
- **ShaderAnimation.tsx** — Custom vertex/fragment shaders creating animated colored rings
- **FeaturesSection.tsx** — 8-card auto-scrolling carousel with:
  - Infinite horizontal strip animation (32s linear loop)
  - Pause-on-hover for entire strip
  - Individual card zoom/lift on hover
  - Click-to-open tooltip system for each feature
- **radar-effect.tsx** — 21st.dev component with:
  - 8 concentric circles + rotating sweep animation
  - 7 GEO icons arranged in 3 rows
  - Click-to-open tooltips for each icon
  - Framer Motion entrance animations
- **HowItWorksSection.tsx** — Interactive 3-step timeline:
  - Cards lift, scale, and glow on hover
  - Independent icon scaling
  - Gradient connector lines (blue→teal→purple)
  - Colored shadows matching accent colors

### Dashboard
- Per-section `whileInView` animations with blur→clear effect
- GaugeSection animates on mount (first visible element)
- Individual viewport triggers: `once: true`, `margin: "-80px"`

### Typography
- **Ovo font** (Google Fonts) applied globally to h1, h2, h3
- CSS variable `--font-display: var(--font-ovo), "Georgia", serif`
- Inter remains body text (16px base, 1.5 line-height)

### Dependencies Added
- `tailwind-merge` — classname utilities
- `three` — Three.js WebGL
- `@types/three` — TypeScript support
- `Ovo` — Google Font integration

## Env Vars Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY (for ChatGPT queries)
ANTHROPIC_API_KEY (for Claude queries)
GOOGLE_GEMINI_API_KEY (for Gemini and Google Search AI Overviews)
CRON_SECRET
NEXT_PUBLIC_APP_URL
```

## GEO Agency Context (added 2026-04-09)

Surven is the tech backbone of a **GEO agency** business. The agency uses Surven to:
- Audit new client AI visibility
- Show clients where they appear (and where they don't) in AI results
- Sell optimization services based on real data
- Track client improvement over time

Surven operates as both a **self-serve SaaS** and the agency's internal operations tool.

## Competitive Target: Otterly.ai

Surven aims to replicate and exceed the tracking capabilities of Otterly.ai with a proprietary system. Advantages of building vs. buying/white-labeling Otterly:
- Own the data (Otterly owns it if you use their platform)
- Build custom features per client request
- Better margins (no third-party fees)
- Competitive moat — agency competitors can't replicate it
- "We built our own tracking platform" is a stronger sales story

**Otterly features already built in Surven:**
- ✅ Search Prompt Monitoring
- ✅ Brand Visibility Tracking
- ✅ Sentiment Analysis
- ✅ Citation Gap Analysis
- ✅ CSV Export
- ✅ Multi-client Workspaces
- ✅ Weekly Automated Monitoring
- ✅ Competitor Benchmarking

**Otterly features still to build:**
- 🔲 AI Prompt Research Tool — surface what prompts real users are searching (not just custom ones)
- 🔲 Brand Visibility Index — a more sophisticated proprietary 0–100 index (not just scan score)
- 🔲 Google Looker Studio Connector — client-facing custom dashboards
- 🔲 40+ country / multi-language support
- 🔲 Client customization layer — add one-off features per client request without breaking core product

## Client Customization Strategy

Reactive approach: don't build everything upfront. When a client asks "can you track X?" — add it, and all future clients benefit. Build the database and services to support new metrics without major refactoring.

## API Budget Guidance

- $500/month recommended to start (covers ~20–30 clients with weekly monitoring)
- Scale with client count: ~$10–45/month per client across ChatGPT + Claude + Perplexity APIs

## Future Work

- Real AI API keys → live scan results (mock engine swaps out automatically)
- AI Prompt Research Tool
- Brand Visibility Index (proprietary scoring model)
- Google Looker Studio connector
- Client customization layer
- Google Stitch integration
- Pricing / billing (Stripe)
- White-label client reports (PDF export)
