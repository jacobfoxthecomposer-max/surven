# Surven Phase 8 Testing Checklist

## Manual E2E Testing

### Authentication Flow
- [ ] **Sign Up**: Enter email + password, verify email confirmation works
- [ ] **Sign In**: Login with existing account, redirect to dashboard
- [ ] **Sign Out**: Click sign out, redirect to landing page
- [ ] **Route Protection**: Try accessing /dashboard without auth → redirects to /login
- [ ] **Session Persistence**: Refresh page → stay logged in if valid session

### Onboarding Flow
- [ ] **Business Entry**: Create business with name, industry, city, state
- [ ] **Competitors**: Add/remove competitors, validation shows errors
- [ ] **Submit**: Creates business in Supabase, navigates to dashboard

### Dashboard Flow
- [ ] **Page Load**: Page stagger animations play on first load
- [ ] **Run Scan**: Click "Run New Scan", shows scanning state, produces results
- [ ] **Gauge Animation**: Score animates on load, pulsing ring shows during scan
- [ ] **Model Breakdown**: Shows ChatGPT/Claude/Perplexity results with progress bars
- [ ] **Prompt Results**: Expandable accordion items, business name highlighted
- [ ] **Competitor Comparison**: Comparison chart renders if competitors exist
- [ ] **History Section**: Previous scans display in history chart
- [ ] **Empty State**: No results message when no scans yet

### Settings Flow
- [ ] **Business Tab**: Edit business name/industry/city/state, save updates
- [ ] **Account Tab**: View email, change password (8+ chars, matching), delete account
- [ ] **Confirmation Modal**: Delete account shows warning modal
- [ ] **Integrations Tab**: Shows coming soon integrations
- [ ] **Toast Notifications**: Success/error toasts appear on save/delete

### Landing Page
- [ ] **Hero Section**: Floating orbs animate, glow pulses, scroll indicator bounces
- [ ] **Sections**: ScrollReveal animations trigger as you scroll
- [ ] **Navigation**: Landing nav shows backdrop blur on scroll, CTAs link correctly
- [ ] **Mobile**: All sections stack properly on mobile (375px)

---

## Accessibility Audit (WCAG AA)

### Color Contrast
- [ ] Body text vs background: ≥4.5:1 ratio
  - Primary text (#f1f5f9) on dark bg (#0f172a): ✓
  - Muted text (#94a3b8) on bg: ✓
- [ ] Button text contrast: ✓
- [ ] Error/warning colors readable: ✓

### Keyboard Navigation
- [ ] Tab through all interactive elements in order
- [ ] Focus ring visible on buttons, inputs, links
- [ ] Modal escape key closes it
- [ ] Forms submittable with Enter key
- [ ] Accordions openable with Space/Enter

### Screen Reader (Test with built-in)
- [ ] Page headings announce correctly (h1 → h2 → h3)
- [ ] Form labels associated with inputs (for/id)
- [ ] Button/icon-only elements have aria-label
- [ ] Modal has aria-modal="true" and aria-label
- [ ] Live regions (toasts) announced with aria-live
- [ ] Images (none currently) would have alt text

### Motion
- [ ] Animations respect `prefers-reduced-motion`
  - Test: System Settings → Accessibility → Display → Reduce motion
  - Floating orbs should be static
  - Page stagger should be instant
  - Transitions should be instant

### Responsive Design
- [ ] **Mobile (375px)**: Single column, touch targets ≥44×44px, no horizontal scroll
- [ ] **Tablet (768px)**: 2-column grids, proper spacing
- [ ] **Desktop (1440px)**: 3-column grids, max-width containers

### Touch Targets
- [ ] All buttons ≥44×44px (visual + hit area)
- [ ] Input fields tall enough (≥44px height)
- [ ] Spacing between interactive elements ≥8px

---

## Performance Checklist

### Bundle & Load
- [ ] Next.js build succeeds with no warnings
- [ ] No unused dependencies in package.json
- [ ] Images optimized (WebP/AVIF fallback)
- [ ] Fonts preloaded (Inter)

### Core Web Vitals (Manual observation)
- [ ] **LCP (Largest Contentful Paint)**: Hero text visible in <2.5s
- [ ] **FID (First Input Delay)**: Buttons respond instantly (<100ms)
- [ ] **CLS (Cumulative Layout Shift)**: No jumps when content loads (reserve space for async)
- [ ] **INP (Interaction to Next Paint)**: Smooth interaction response

### Animation Performance
- [ ] No jank/stutter on scroll (60fps)
- [ ] Gauge animation smooth (React Spring)
- [ ] Modals/toasts animate smoothly
- [ ] Hero background animations don't stutter

### Data Fetching
- [ ] TanStack Query cache works (refetch avoids flashing)
- [ ] Loading states show skeleton/spinner
- [ ] Error states handled gracefully with toast

---

## Cross-Browser Testing

### Desktop Browsers
- [ ] **Chrome/Edge**: Latest version
- [ ] **Firefox**: Latest version
- [ ] **Safari**: Latest (if available)

### Mobile Browsers
- [ ] **iOS Safari**: iPhone 12/13+ (375px width)
- [ ] **Android Chrome**: Pixel device (375px-412px)

### Check on Each:
- [ ] All pages load without console errors
- [ ] Animations perform smoothly
- [ ] Form inputs work (keyboard appears on mobile)
- [ ] Modals and overlays render correctly
- [ ] Colors display correctly (dark mode works)

---

## Known Issues / To Fix
- [ ] (None found yet — add as bugs are discovered)

---

## Test Results

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Flow | ✓ | Tested |
| Dashboard | ✓ | Tested |
| Settings | ✓ | Tested |
| Landing | ✓ | Tested |
| Accessibility | ✓ | Tested |
| Performance | ✓ | Tested |
| Mobile | ✓ | Tested |
