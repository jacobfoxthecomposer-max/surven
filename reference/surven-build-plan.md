# Surven – Build Plan & Task Breakdown

**MVP Launch Target:** Complete, polished, production-ready  
**Tech Stack:** React + Next.js 16 + Tailwind CSS + Framer Motion + Recharts + Supabase + Vercel  
**Estimated Duration:** 2–3 weeks (with focused development)

---

## ✅ Session Log — Completed Work (April 2026)

### Auth & Routing Fixes
- [x] Fixed Vercel build failure (ENOENT middleware.js.nft.json) — renamed middleware.ts → proxy.ts (Next.js 16 convention)
- [x] Fixed sign-in not redirecting — switched from `createClient` (localStorage) to `createBrowserClient` (cookies) so server proxy can read session
- [x] Fixed "Failed to save" error on onboarding — Supabase `PostgrestError` is not `instanceof Error`, fixed error handler
- [x] Created `businesses` and `competitors` tables in Supabase
- [x] Fixed `.single()` bug in `getBusiness` — switched to `.limit(1)` to handle multiple rows
- [x] Fixed redirect loop (dashboard ↔ onboarding) — removed auto-redirect from dashboard, now shows static fallback UI with button
- [x] Fixed navigation glitching (settings → dashboard) — added `staleTime: 5min` to TanStack queries, removed duplicate `useAuth()` from DashboardLayout, added `isFetching` guard on redirect logic
- [x] Fixed sign-out leaving stale data — `queryClient.clear()` on sign-out
- [x] **Root fix for all ping-pong**: Converted `useAuth` from standalone hook to shared `AuthProvider` context — single Supabase subscription, single auth state across entire app

### Scan Engine
- [x] Fixed wildly inconsistent scan scores (was jumping 72% → 40% → 20%) — replaced probabilistic RNG with deterministic hash-based score (22–78% stable per business, ±1% cosmetic noise)
- [x] Built real AI scan API route (`/api/scan`) — calls OpenAI gpt-4o-mini, Claude Haiku, Perplexity sonar at temperature=0; falls back to mock if no API keys set
- [x] Added sentiment analysis to scan results (positive/neutral/negative per mention)
- [x] Added citation extraction from AI responses
- [x] Added `customPrompts` support to mock scan engine and API route

### Infrastructure
- [x] Deployed to Vercel (production)
- [x] GitHub repo: jacobfoxthecomposer-max/surven

---

## 🔜 Next Up — Phase 1 Feature Build (~70% of a Sonnet session)

Use model: **Sonnet**. Start fresh session. Reference `/Users/jacobkindall/surven/`.

### Features to Build
- [ ] Search Prompt Monitoring (query ChatGPT/Claude/Perplexity with business keywords)
- [ ] Brand Visibility Tracking (track mention rate over time)
- [ ] Custom Prompt Manager (clients add/remove their own prompts to monitor)
- [ ] Weekly Automated Scans (Vercel cron job)
- [ ] CSV Export (`GET /api/export/csv`)
- [ ] Scan history improvements (timeline view)

### New Database Tables Needed (Supabase)
- `custom_prompts` — per-client custom search prompts
- `scan_schedules` — weekly monitoring config per client
- `brand_metrics` — calculated metrics (visibility score, sentiment, citations)

### New API Routes Needed
- `POST /api/scan/run` — manual scan trigger
- `POST /api/scan/schedule` — set up weekly automated scans
- `GET /api/scan/results` — fetch results for dashboard
- `POST /api/scan/custom-prompt` — add custom prompt
- `GET /api/export/csv` — export all data as CSV

### Phase 2 (separate session after Phase 1)
- [ ] Sentiment Analysis display in dashboard
- [ ] Citation Gap Analysis
- [ ] Competitor Benchmarking
- [ ] Multi-client Workspaces
- [ ] Brand Visibility Index scoring
- [ ] Looker Studio Integration

---

---

## Phase 1: Foundation & Setup (Days 1–2)

### 1.1 Project Initialization
- [ ] Create Next.js project with TypeScript
- [ ] Configure Tailwind CSS with dark mode (class strategy)
- [ ] Setup Supabase project & get API keys
- [ ] Create `.env.local` with Supabase credentials
- [ ] Install dependencies: framer-motion, recharts, react-hook-form, zod, @supabase/supabase-js

### 1.2 Folder Structure
- [ ] Create `/src` directory structure (components, features, services, types, styles, utils)
- [ ] Setup TypeScript types for database tables
- [ ] Create utility functions (cn, constants, colors)

### 1.3 Styling Foundation
- [ ] Configure Tailwind colors with CSS variables
- [ ] Create globals.css with dark mode setup
- [ ] Create theme provider component
- [ ] Define animation timing constants

### 1.4 Supabase Setup
- [ ] Create database tables (users, businesses, competitors, scans, scan_results)
- [ ] Setup Supabase client file
- [ ] Create auth service (signUp, login, logout, getUser)
- [ ] Create business service (CRUD operations)

---

## Phase 2: Core Components (Days 3–4)

### 2.1 Atomic Components
- [ ] **Button** component (primary, secondary, danger, loading states)
- [ ] **Input** component (email, password, text with labels + errors)
- [ ] **Select/Dropdown** component
- [ ] **Badge** component (success, warning, error variants)
- [ ] **Card** component (reusable container)
- [ ] **Spinner** component
- [ ] **Toast** component (success/error notifications)

### 2.2 Molecules
- [ ] **FormField** component (input + label + error)
- [ ] **Modal/Dialog** component
- [ ] **Avatar** component (optional for future user profiles)

### 2.3 Complex Visualizations
- [ ] **VisibilityGauge** (animated circular progress, React Spring)
- [ ] **ModelBreakdownCard** (3-card layout for ChatGPT/Claude/Perplexity)
- [ ] **PromptResultItem** (expandable prompt result)
- [ ] **HistoryChart** (line chart with Recharts, animations)
- [ ] **ComparisonChart** (bar chart for competitors)

---

## Phase 3: Authentication & Onboarding (Days 5–6)

### 3.1 Auth Pages
- [ ] **Login Page**
  - Email + password form
  - Sign up toggle
  - Error handling
  - Loading states
  - Success redirect to dashboard/onboarding

- [ ] **Sign Up Page**
  - Name + Email + Password + Confirm Password
  - Form validation (Zod + React Hook Form)
  - Password strength indicator
  - Success redirect to onboarding

### 3.2 Onboarding
- [ ] **Onboarding Page**
  - Business name input
  - Industry dropdown
  - City + State inputs
  - Competitor inputs (up to 3, add/remove)
  - Form validation
  - Success creates business in Supabase + redirects to dashboard

### 3.3 Auth Hook
- [ ] Create `useAuth` hook (auth state, login, signup, logout)
- [ ] Create Auth Context for global user state
- [ ] Setup route protection (PrivateRoute component)

---

## Phase 4: Dashboard (Days 7–10)

### 4.1 Dashboard Layout
- [ ] **Main dashboard page structure** (header + sections)
- [ ] **Header component** (business name, last scan time, run scan button)
- [ ] **Responsive layout** (works on mobile + desktop)

### 4.2 Dashboard Sections
- [ ] **Visibility Gauge Section**
  - Animated gauge (0–100)
  - Score color coding (red/orange/green/teal)
  - Interpretation text
  - "Run New Scan" button

- [ ] **AI Model Breakdown Section**
  - 3 cards (ChatGPT, Claude, Perplexity)
  - Each shows: mentioned count, progress bar, status badge
  - Hover effects

- [ ] **Prompt Results Section**
  - Collapsible accordion list
  - Each prompt shows model indicators (✓/✗)
  - Expandable to show response snippet
  - Business name highlighting

- [ ] **Competitor Comparison Section** (conditional)
  - Bar chart with business + competitors
  - Mentions count display
  - Interactive tooltips

- [ ] **History Section**
  - Line chart (dates vs score)
  - Animated line draw-in
  - Interactive dots with tooltips

### 4.3 Dashboard Logic
- [ ] `useScan` hook (fetch scan data, run new scan)
- [ ] Mock scan engine implementation
- [ ] Scan result storage in Supabase
- [ ] Real-time data updates

---

## Phase 5: Landing Page (Days 11–12)

### 5.1 Landing Structure
- [ ] **Hero Section**
  - Headline + subheading
  - Hero image or background animation
  - "Track Your AI Visibility" CTA button
  - Parallax or subtle scroll animation

- [ ] **Three Value Props Section**
  - Scan card (icon + text)
  - Score card (icon + text)
  - Improve card (icon + text)
  - Fade + slide-in animations on scroll

- [ ] **How It Works Section**
  - Timeline-style 3-step visual
  - Animated icons/illustrations
  - Sequential scroll reveals

- [ ] **Social Proof / Testimonials** (optional)
  - Early adopter stats or quotes
  - Scroll-reveal cards

- [ ] **Final CTA Section**
  - "Ready to know where you show up?" + button

- [ ] **Footer**
  - Surven branding
  - Links (Pricing, Blog, Docs, Contact)

### 5.2 Landing Animations
- [ ] Scroll reveals with Framer Motion
- [ ] Parallax on hero (if included)
- [ ] Staggered card entrance animations
- [ ] Hover effects on buttons/cards

---

## Phase 6: Settings & Polish (Days 13–14)

### 6.1 Settings Page
- [ ] **Business Settings Tab**
  - Edit business name, industry, location
  - Edit competitor list
  - Save button

- [ ] **Account Settings Tab**
  - Display email (read-only or editable)
  - Change password button
  - Account deletion (destructive button)

- [ ] **Integrations Tab**
  - Google Stitch status (Not Connected + button)
  - 21st.dev status (Not Connected + button)

### 6.2 UX Polish
- [ ] Toast notifications (scan started, scan complete, errors)
- [ ] Loading states on all async operations
- [ ] Error boundary for crash handling
- [ ] Skeleton screens for loading states
- [ ] Confirmation dialogs for destructive actions

### 6.3 Accessibility
- [ ] [ ] WCAG AA color contrast audit
- [ ] [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] [ ] Focus states visible on all interactive elements
- [ ] [ ] Screen reader testing (VoiceOver/NVDA)
- [ ] [ ] Aria labels on icon-only buttons
- [ ] [ ] Form field association (label + input)
- [ ] [ ] Role attributes for semantic meaning

### 6.4 Responsive Design
- [ ] [ ] Test at 375px (small phone)
- [ ] [ ] Test at 768px (tablet)
- [ ] [ ] Test at 1024px (desktop)
- [ ] [ ] Test at 1440px (large desktop)
- [ ] [ ] Landscape orientation support
- [ ] [ ] Mobile touch interactions (44×44px targets)

---

## Phase 7: Animation Implementation (Days 15–16)

### 7.1 Page Load Animations
- [ ] Hero section fade-in
- [ ] Content cards slide-up + fade
- [ ] Gauge animates to final score (spring physics)
- [ ] Charts draw in (line animation)

### 7.2 Interaction Animations
- [ ] Button hover states (150–250ms)
- [ ] Card hover effects
- [ ] Modal entrance/exit
- [ ] Form field focus animations
- [ ] Error message slide-in

### 7.3 Scroll Animations
- [ ] Landing page scroll reveals (cards fade + slide)
- [ ] Parallax on hero (if included)
- [ ] Stagger animations for lists

### 7.4 Chart Animations
- [ ] Line chart draws on load
- [ ] Bar chart bars animate width on load
- [ ] Gauge animates on data update
- [ ] Dots/points pulse on interaction

---

## Phase 8: Testing & Optimization (Days 17–18)

### 8.1 Performance
- [ ] [ ] Measure Core Web Vitals (LCP, FID, CLS)
- [ ] [ ] Optimize images (WebP, lazy loading)
- [ ] [ ] Code splitting for routes
- [ ] [ ] Memoize expensive components
- [ ] [ ] Profile animations (60fps target)

### 8.2 Testing
- [ ] [ ] Manual testing of all flows
- [ ] [ ] Form validation testing (edge cases)
- [ ] [ ] Auth flow testing (signup, login, logout)
- [ ] [ ] Scan creation and result storage
- [ ] [ ] Dark mode toggle functionality
- [ ] [ ] Responsive layout on all breakpoints
- [ ] [ ] Animation smoothness
- [ ] [ ] Error handling (network errors, validation, etc.)

### 8.3 Browser Testing
- [ ] [ ] Chrome (latest)
- [ ] [ ] Firefox (latest)
- [ ] [ ] Safari (latest)
- [ ] [ ] Mobile Safari (iOS)
- [ ] [ ] Chrome Mobile (Android)

### 8.4 Accessibility Audit
- [ ] [ ] Run Lighthouse accessibility audit
- [ ] [ ] Fix any reported issues
- [ ] [ ] Screen reader test (VoiceOver on macOS)
- [ ] [ ] Keyboard navigation test (all interactive elements)
- [ ] [ ] Color contrast check with tools

---

## Phase 9: Deployment & Launch (Days 19–20)

### 9.1 Pre-Launch Checklist
- [ ] [ ] All environment variables set
- [ ] [ ] API keys secured (not in code)
- [ ] [ ] Database backups configured
- [ ] [ ] Error logging setup (Sentry optional)
- [ ] [ ] Analytics setup (Google Analytics optional)

### 9.2 Deployment
- [ ] [ ] Deploy to Vercel (or chosen hosting)
- [ ] [ ] Setup custom domain
- [ ] [ ] SSL certificate verified
- [ ] [ ] Database replicated to production Supabase project
- [ ] [ ] Test all flows in production

### 9.3 Post-Launch
- [ ] [ ] Monitor error logs
- [ ] [ ] Check performance metrics
- [ ] [ ] Gather early user feedback
- [ ] [ ] Plan Phase 2 enhancements (real APIs, etc.)

---

## Dependencies & Library Setup

```bash
# Core
npm install next react react-dom
npm install typescript

# Animation
npm install framer-motion @react-spring/web

# Styling
npm install -D tailwindcss postcss autoprefixer
npm install class-variance-authority

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Data & API
npm install @supabase/supabase-js
npm install @tanstack/react-query

# Charts
npm install recharts

# UI Utilities
npm install clsx
npm install lucide-react (or heroicons)

# Development
npm install -D prettier eslint
```

---

## Notes & Tips

1. **Start with mock data** — Use the mock scan engine until real APIs are ready
2. **Component library first** — Build components in isolation before assembling pages
3. **Dark mode throughout** — Design and test dark mode from day one, not as an afterthought
4. **Accessibility is not final step** — Integrate accessibility from the start (ARIA, semantic HTML, keyboard nav)
5. **Animation performance** — Profile animations early; use React DevTools Profiler
6. **Test on real devices** — Don't just use browser DevTools; test on actual phones/tablets
7. **Version control** — Commit frequently with clear messages
8. **Document decisions** — Keep a DECISIONS.md for architectural choices

---

## Success Criteria for MVP Launch

✅ Landing page converts visitors → signup  
✅ Auth flow is smooth (signup → onboarding → dashboard)  
✅ Dashboard displays mock scan results beautifully  
✅ Animations are smooth (60fps, no jank)  
✅ All forms validate and show clear errors  
✅ Dark mode works seamlessly  
✅ Responsive design works on mobile through desktop  
✅ Accessibility passes WCAG AA audit  
✅ No console errors or warnings  
✅ Deployed and live  

---

**Ready to start building!**

---

## ✅ Phase 2 — Advanced Analytics (completed 2026-04-09)

### Sentiment Analysis
- [x] `sentiment` TEXT column on scan_results (positive | neutral | negative)
- [x] `analyzeSentiment()` in `/api/scan` — Claude Haiku, max_tokens: 5, temperature: 0
- [x] `SentimentSection.tsx` — animated bars + dominant tone label
- [x] Mock engine uses hash-based deterministic sentiment
- [x] SQL: `ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK(...)`

### Citation Gap Analysis
- [x] `citations` JSONB column on scan_results
- [x] `extractCitations()` regex extracts domains from AI response URLs
- [x] `CitationGapSection.tsx` — top 10 domains with Listed (green) / Gap (red) badges
- [x] Mock engine generates fake citation domains (yelp, tripadvisor, etc.)
- [x] SQL: `ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS citations JSONB`

### Competitor Benchmarking
- [x] `CompetitorBenchmarkSection.tsx` — per-competitor cards, per-model (GPT/Claude/Pplx) head-to-head bars
- [x] Delta badges (+/-%) with trending arrows
- [x] `useCompetitors.ts` hook — add/delete individual competitors
- [x] `addCompetitor` / `deleteCompetitor` in businessService
- [x] Competitors section added to Settings → Business tab

### Multi-client Workspaces
- [x] `ActiveBusinessContext` (`useActiveBusiness.tsx`) — active business ID stored in localStorage
- [x] `getAllBusinesses()` fetches all businesses for a user
- [x] `BusinessSwitcher.tsx` — dropdown in header next to logo ("Add new business")
- [x] `/onboarding/new/page.tsx` — clean form to add another business
- [x] `useBusiness` and `useSettings` now both read from `ActiveBusinessContext`
- [x] Business delete cascades: scan_results → scans → search_prompts → competitors → business
- [x] Danger Zone in Settings → Business with confirmation step

## ✅ Phase 3 — Animations & Visual Polish (completed 2026-04-09)

### Landing Page Hero
- [x] `HeroSection.tsx` — full-screen hero with ShaderAnimation as background
- [x] `ShaderAnimation.tsx` (THREE.js WebGL) — colored ring animations, fills entire viewport
- [x] Dark overlay (#0f172a/55) + radial vignette for text readability over shader
- [x] Fixed background effect (shader stays while content scrolls over z-10 wrapper)

### Landing Page Features & Sections
- [x] `FeaturesSection.tsx` — 8-card interactive carousel with radar-effect tooltip system
  - Auto-scrolling infinite horizontal strip (32s, 8 cards duplicated for seamless loop)
  - Cards pause on hover, zoom/lift on individual card hover
  - Click to open tooltip explaining each feature (Framer Motion scale/fade entrance)
  - Cards: Mention Tracking, Multi-Model, Real Prompts, Trend Analysis, Auto Scans, Competitor Bench, Citation Gaps, Data Export
  
- [x] `radar-effect.tsx` — 21st.dev component integrated
  - Concentric circle animation (8 rings, rotating sweep line)
  - 7 GEO-themed icons arranged in 3 rows around radar
  - Framer Motion entrance animations for icons
  - Click-to-open tooltip for each icon (AnimatePresence, scale/opacity)
  - Dynamically generated based on features passed as props

- [x] `HowItWorksSection.tsx` — interactive 3-step timeline (21st.dev component)
  - Cards lift, scale, glow on hover
  - Icons scale independently on card hover
  - Gradient connector lines (blue→teal→purple)
  - Colored box shadows matching accent colors (#4361ee, #06d6a0, #8b5cf6)
  - 0.3s smooth transitions on all hover effects

### Dashboard
- [x] Replaced mount-time stagger with per-section `whileInView` + blur/fade/slide reveal
- [x] GaugeSection still animates on mount (first visible element)
- [x] `reveal` object: `{ opacity: 0, y: 28, filter: "blur(4px)" }` → `{ opacity: 1, y: 0, filter: "blur(0px)" }`
- [x] Viewport settings: `once: true`, `margin: "-80px"` to trigger animation 80px before entering viewport
- [x] Applied to: ModelBreakdownSection, SentimentSection, PromptResultsSection, ComparisonSection, CompetitorBenchmarkSection, CitationGapSection, HistoryChartSection

### Typography & Fonts
- [x] Added Ovo font from Google Fonts (weight: 400)
- [x] CSS variable `--font-display: var(--font-ovo), "Georgia", serif`
- [x] Applied globally to h1, h2, h3 via CSS rule
- [x] Inter (16px base, 1.5 line-height) remains body text

### Dependencies Added
- [x] `tailwind-merge` — merging Tailwind classNames
- [x] `three` — Three.js WebGL library
- [x] `@types/three` — TypeScript types for Three.js

### Code Quality Fixes
- [x] **Auth fix:** proxy.ts switched from `getSession()` to `getUser()` for server-side JWT validation
- [x] **Auth fix:** Removed invalid `headers` parameter from setAll() function
- [x] **Auth fix:** Added `/onboarding` to protected routes array
- [x] **TypeScript fix:** Used `as const` on ease array in dashboard animation code

## Current Dashboard Section Order

1. Run New Scan (Visibility Gauge)
2. AI Model Breakdown
3. Brand Sentiment
4. Prompt Results
5. Competitor Comparison
6. Competitor Benchmarking
7. Citation Gap Analysis
8. Visibility Over Time
9. Export CSV

## GEO Agency Context

Surven is the tech backbone of a **GEO agency** business. The agency uses Surven to:
- Audit new client AI visibility
- Show clients where they appear (and where they don't) in AI results
- Sell optimization services based on real data
- Track client improvement over time

Surven operates as both a **self-serve SaaS** and the agency's internal operations tool.

## Competitive Target: Otterly.ai

Surven aims to replicate and exceed Otterly.ai's tracking capabilities with a proprietary system.

**Advantages of building vs. buying/white-labeling:**
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
- 🔲 Brand Visibility Index — sophisticated proprietary 0–100 index (not just scan score)
- 🔲 Google Looker Studio Connector — client-facing custom dashboards
- 🔲 40+ country / multi-language support
- 🔲 Client customization layer — add one-off features per client request

## Client Customization Strategy

Reactive approach: when a client asks "can you track X?" — add it, and all future clients benefit. Build the database and services to support new metrics without major refactoring.

## API Budget Guidance

- $500/month recommended to start (covers ~20–30 clients with weekly monitoring)
- Scale with client count: ~$10–45/month per client across ChatGPT + Claude + Perplexity APIs

## ✅ Phase 10 — AI Tracking Integration (Otterly Competitive) [IN PROGRESS]

**Objective:** Implement remaining features to fully compete with Otterly.ai

### Brand Visibility Index (Proprietary Scoring)
- [ ] Add `visibility_index` INT and `score_breakdown` JSONB columns to scans table
- [ ] Implement multi-factor algorithm: mentions (40%), sentiment (30%), competitor positioning (20%), trend (10%)
- [ ] Create `calculateVisibilityIndex()` service function
- [ ] Update dashboard to show index prominently with breakdown tooltip

### Enhanced Prompt Research Tool
- [ ] Create `prompt_templates` table with 50+ industry/location combinations
- [ ] Add `country_code` + `language_code` columns to `search_prompts`
- [ ] Build `PromptTemplateCarousel` component
- [ ] Integrate templates into `PromptsTab` for easy discovery

### Feature Request Management System
- [ ] Create `feature_requests` and `client_custom_features` tables
- [ ] Build `FeatureRequestForm` component (client-facing)
- [ ] Add "Request a Feature" tab in Settings
- [ ] Admin dashboard for reviewing/implementing requests

### Google Looker Studio Connector [Optional]
- [ ] Setup BigQuery project + service account
- [ ] Create `looker_studio_connections` table
- [ ] Build Google OAuth flow in Settings
- [ ] Create BigQuery sync pipeline (on scan completion)
- [ ] Document setup for clients

### Dashboard Updates
- [ ] Replace old score with VisibilityIndex
- [ ] Add VisibilityIndexCard with score breakdown
- [ ] Add ScoreBreakdownChart (pie showing contributing factors)
- [ ] Update all sections for multi-language support

**Timeline:** 2–4 days  
**Reference:** See `surven-ai-tracking-integration.md` for full implementation details

## Phase 11 — Polish & Agency Launch Ready [READY TO START]

### 11.1 Testing
- [ ] End-to-end testing of all tracking features
- [ ] Custom feature addition workflow edge cases
- [ ] Load test with 50+ simulated clients

### 11.2 Documentation
- [ ] Update README with new features
- [ ] Create client-facing feature documentation
- [ ] Document API routes for partners

### 11.3 Final Polish
- [ ] Performance optimization (feature flags, lazy loading)
- [ ] Accessibility audit for new components
- [ ] Responsive testing on all breakpoints
- [ ] Dark mode verification

**Timeline:** 1–2 days

## Key Dev Notes

- Mock engine always used when no AI API keys in env
- `NOTIFY pgrst, 'reload schema'` needed after any Supabase schema changes
- All pushes to `main` auto-deploy to Vercel
- Service role key used server-side only (cron, never client)
- See `surven-ai-tracking-integration.md` for detailed Phase 10 implementation plan
- Reactive customization strategy: build features as clients request them
