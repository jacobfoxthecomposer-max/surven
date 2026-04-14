# Surven Development – Quick Reference Card

## 🎯 Project Goal
Premium GEO (Generative Engine Optimization) SaaS platform tracking AI visibility of businesses across ChatGPT, Claude, Perplexity.

**MVP Launch:** 2–3 weeks | **Status:** Ready to build

---

## 📋 Essential Files
- `surven-geo-marketing-design-brief.md` — Full design spec (5+ pages, all pages/components)
- `surven-saas-build-guide.md` — 2026 best practices (React, animations, forms, charts)
- `surven-build-plan.md` — Task breakdown (9 phases, all daily tasks)
- Memory: `project_surven_geo_platform.md` — Project context & decisions

---

## 🛠 Tech Stack (Production-Ready 2026)

```
Frontend:    React 19 + Next.js + TypeScript
Styling:     Tailwind CSS + CSS Variables + Dark Mode
Animation:   Framer Motion + React Spring
Charts:      Recharts (dark mode, accessible)
Forms:       React Hook Form + Zod
State:       Context + TanStack Query
Auth/DB:     Supabase (PostgreSQL + Auth)
```

---

## 🎨 Design Tokens

### Colors (Dark Premium)
```
bg:        #0f172a   (navy)
fg:        #f1f5f9   (white)
primary:   #4361ee   (electric blue)
secondary: #06d6a0   (teal)
danger:    #ef4444   (red)
warning:   #f97316   (orange)
success:   #84cc16   (green)
```

### Animation Timings
```
micro:      150–250ms (hovers, small elements)
transition: 300–400ms (page changes)
entrance:   400–600ms (cards, modals)
charts:     600–1200ms (line draw, gauge fill)
```

### Typography
```
font:        Inter (all)
base:        16px
line-height: 1.5
scale:       12 / 14 / 16 / 18 / 24 / 32 / 48
```

---

## 📂 Folder Structure
```
src/
├── components/
│   ├── atoms/          (Button, Input, Badge, Spinner)
│   ├── molecules/      (Card, FormField, Toast)
│   └── organisms/      (Dashboard sections, large components)
├── features/
│   ├── auth/          (Login, Signup, useAuth)
│   ├── dashboard/     (Dashboard, useScan)
│   ├── business/      (useBusiness, services)
│   └── onboarding/    (Onboarding form)
├── services/
│   ├── supabase.ts    (Supabase client)
│   ├── api.ts         (API calls)
│   └── mockScanEngine.ts (Mock data)
├── types/
│   ├── database.ts    (Supabase types)
│   └── business.ts    (Domain types)
├── hooks/
│   ├── useAuth.ts
│   ├── useScan.ts
│   └── useAnimation.ts
├── styles/
│   └── globals.css    (Tailwind + CSS vars)
└── utils/
    ├── cn.ts          (classname helper)
    └── constants.ts   (timings, colors)
```

---

## 🚀 Development Flow

### Phase 1: Foundation (Days 1–2)
- [ ] Next.js + TypeScript setup
- [ ] Tailwind CSS + dark mode
- [ ] Supabase project + database
- [ ] Folder structure + utils

### Phase 2: Components (Days 3–4)
- [ ] Atomic components (Button, Input, Badge, etc.)
- [ ] Complex viz (Gauge, Charts)
- [ ] Component library complete

### Phase 3: Auth & Onboarding (Days 5–6)
- [ ] Login/Signup pages
- [ ] Supabase auth integration
- [ ] Onboarding form

### Phase 4: Dashboard (Days 7–10)
- [ ] Gauge + breakdown cards
- [ ] Prompt results + charts
- [ ] Mock scan engine

### Phase 5: Landing (Days 11–12)
- [ ] Hero + value props
- [ ] How it works + CTA
- [ ] Scroll animations

### Phase 6: Settings & Polish (Days 13–14)
- [ ] Settings page
- [ ] Toast notifications
- [ ] Error handling

### Phase 7: Animations (Days 15–16)
- [ ] All entrance animations
- [ ] Scroll reveals
- [ ] Chart animations

### Phase 8: Testing (Days 17–18)
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] Cross-browser testing

### Phase 9: Deploy (Days 19–20)
- [ ] Vercel deployment
- [ ] Domain setup
- [ ] Live monitoring

---

## 🎬 Key Animations to Implement

### Page Load
```
Hero → fade-in (300ms)
Cards → slide-up + fade (200–500ms staggered)
Gauge → animate 0→score (1.2s spring)
Charts → line draw-in (800–1200ms)
```

### Interactions
```
Button hover → color shift + shadow (200ms)
Card hover → scale 1.02 + shadow increase (200ms)
Form focus → label animate, border color shift (150ms)
Modal enter → scale-in + fade (300ms)
Error slide → from bottom (200ms)
```

### Scroll Effects
```
Landing cards → fade + slide-up on scroll
Parallax → subtle background movement
Chart dots → pulse on interaction
```

---

## 🔑 Critical Implementation Rules

### Performance
- Animate **transform/opacity only** (never width/height)
- Use `React.memo()` on expensive components
- Lazy load routes with `React.lazy()`
- Memoize chart data with `useMemo()`

### Accessibility
- All interactive elements have **visible focus**
- Forms have **labels** + **aria-label** on icons
- **Color contrast ≥4.5:1** (WCAG AA)
- **Touch targets ≥44×44px** on mobile
- Respect **prefers-reduced-motion**

### Dark Mode
- Use **CSS variables** (not hardcoded hex)
- Test contrast in both light & dark
- Don't invert colors; create dedicated palettes
- Apply to Recharts with theme props

### Forms
- Validate **onBlur** (not keystroke)
- Use Zod for type-safe schemas
- Show errors **below field** in red
- Disabled button during submit

### Charts (Recharts)
- Add **aria-label** to chart container
- Include **legend** + **tooltip**
- Use **patterns** not just color (colorblind-friendly)
- Memoize data with `useMemo()`

---

## 📦 Exact Dependencies

```bash
npm install next react react-dom typescript
npm install tailwindcss postcss autoprefixer
npm install framer-motion @react-spring/web
npm install react-hook-form zod @hookform/resolvers
npm install @supabase/supabase-js @tanstack/react-query
npm install recharts
npm install class-variance-authority clsx lucide-react
npm install -D prettier eslint
```

---

## 🧠 Architecture Patterns

### Container/Presentational
```
DashboardContainer (data, logic)
  ↓
DashboardPresentation (pure render)
```

### Custom Hooks
```
useAuth()     → auth state, login, logout
useScan()     → scan data, runScan mutation
useBusiness() → business data
```

### Atomic Design
```
Atoms:     Button, Input, Badge, Spinner
Molecules: Card, FormField, Toast, Modal
Organisms: DashboardGaugeSection, Charts
Templates: DashboardLayout, AuthLayout
Pages:     DashboardPage, LoginPage, etc.
```

---

## ✅ Pre-Launch Checklist

- [ ] All animations smooth (60fps, no jank)
- [ ] Dark mode works + contrast verified
- [ ] Forms validate onBlur with clear errors
- [ ] Touch targets ≥44×44px
- [ ] Keyboard navigation works (Tab, Escape)
- [ ] Responsive at 375px / 768px / 1024px / 1440px
- [ ] WCAG AA accessibility audit pass
- [ ] No console errors
- [ ] API keys never in code
- [ ] Supabase backups configured
- [ ] Deployed to Vercel

---

## 🔗 Web Resources (Bookmarks)

**React/Next.js:**
- [React 19 Docs](https://react.dev)
- [Next.js Docs](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query)

**Animation:**
- [Framer Motion](https://motion.dev)
- [React Spring](https://github.com/pmndrs/react-spring)
- [Spring Physics Visualizer](https://react-spring-visualizer.com/)

**Data Viz:**
- [Recharts Docs](https://recharts.org)
- [Accessible Charts](https://www.a11y-collective.com/blog/accessible-charts/)

**Forms:**
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

**Styling:**
- [Tailwind CSS](https://tailwindcss.com)
- [Dark Mode Guide](https://tailwindcss.com/docs/dark-mode)

**Auth:**
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

**Accessibility:**
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## 💬 Communication Style

**When building:**
- Focus on features, not process
- Use technical terminology
- Reference best practices from guides
- Show code examples inline
- Test early, iterate fast
- Keep PRs small & focused

**Decision-making:**
- Design dark mode first (it's premium)
- Animations second (they're differentiators)
- Forms & validation third (core functionality)
- Polish last (final 10% that makes MVP feel pro)

---

## 🎯 Launch Metrics

**Success = Users can:**
1. Land on page, understand GEO concept
2. Sign up without friction
3. Add business + competitors
4. Run first scan in <30 seconds
5. See beautiful results on dashboard
6. Feel like using a premium product

---

**Start with Phase 1 Foundation. Build component by component. Ship fast. Iterate.**
