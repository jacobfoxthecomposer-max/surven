# Surven – GEO Marketing Platform Design Brief
## AI Visibility Tracker & Generative Engine Optimization Tool

---

## Executive Overview

**Surven** is a premium SaaS platform that helps businesses track and optimize their visibility in AI-generated responses. When consumers ask ChatGPT, Claude, Perplexity, and other generative AI models for recommendations—"What's the best dentist in Hartford CT?" "Who are the top marketing agencies in New York?"—some businesses get mentioned and some don't. Surven tracks whether your business appears in those AI answers.

This is **GEO (Generative Engine Optimization)**: the strategy of ensuring your business shows up when AI models answer real customer questions in your industry and location.

---

## Design Philosophy

Surven is a **data-driven SaaS tool** for business owners and marketing professionals. The design must feel:

- **Premium & Professional**: Think Linear, Vercel, or Stripe dashboards—clean, intentional, high-quality
- **Dark & Modern**: Dark navy/charcoal base with electric blue and teal accents for a sophisticated, developer-forward aesthetic
- **Interactive & Animated**: Smooth scrolling animations, entrance transitions, live data gauge animations, and chart animations that bring data to life
- **Data-Centric**: Information hierarchy that makes metrics immediately understandable at a glance
- **Accessible**: WCAG AA compliant with proper contrast, focus states, and keyboard navigation

### Color Palette (Premium Dark Theme)

**Primary Background:** `#0f172a` (dark navy)  
**Secondary Surface:** `#1e293b` (slate-800)  
**Tertiary Surface:** `#334155` (slate-700)  
**Primary Accent:** `#4361ee` (electric blue) — CTAs, scores, highlights  
**Secondary Accent:** `#06d6a0` (teal) — Success states, positive metrics  
**Danger/Warning:** `#f97316` (orange) — Low visibility, alerts  
**Text Primary:** `#f1f5f9` (white/off-white)  
**Text Secondary:** `#cbd5e1` (slate-300)  

### Typography System

**Headings (h1, h2, h3):** Ovo (Google Fonts, 400 weight) — elegant serif font for premium feel  
**Body:** Inter Regular, 400 weight, 16px base, 1.5 line-height  
**Label/Micro:** Inter Medium, 500 weight, 12–14px  
**Font Scale:** 12 / 14 / 16 / 18 / 24 / 32 / 48px  

### Interactive Effects

- **Micro-interactions:** 150–250ms duration (buttons, hovers, state changes)
- **Page transitions:** 300–400ms (page fades, slides on navigation)
- **Entrance animations:** Staggered at 30–50ms per element
- **Gauge/Score animation:** 800–1200ms spring curve on initial load
- **Chart data animation:** 600–800ms easing-out as bars/lines animate

---

## Core User Flow & Pages

### 1. Landing Page (`/`)

**Purpose:** Attract early-stage businesses and communicate the GEO opportunity.

**Hero Section** (Full-Screen WebGL Animation)
- Full-screen viewport with Three.js WebGL shader animation background (animated colored rings)
- Fixed background (stays in place while content scrolls)
- Dark overlay (#0f172a/55) + radial vignette for text readability
- Large, bold headline: *"See if AI is recommending your business"* (Ovo font)
- Subheading: *"Surven tracks your visibility across ChatGPT, Claude, Perplexity, and more — so you can show up where your customers are searching."*
- Primary CTA button: **"Track Your AI Visibility – Free"** (electric blue)
- Hero content animates in on load (fade + slide-up)

**Three-Column Value Props** (Scroll Reveal)
- Each card animates in on scroll with a subtle fade + slide-up (50ms stagger)
  1. **Scan**: Icon + text describing how Surven queries AI models with realistic consumer prompts
  2. **Score**: Icon + text describing the visibility score calculation
  3. **Improve**: Icon + text describing competitive insights and optimization guidance

**How It Works Section** (Timeline-style)
- Simple three-step visual flow: Add Business → Run Scan → See Results
- Each step has an animated icon or illustration
- On scroll, steps animate in sequentially

**Social Proof / Testimonials Section** (Optional)
- Could include "Early adopters are seeing 3-5x more AI mentions" or similar
- Use cards that fade in on scroll

**Compelling CTA Section** (Near footer)
- Reiterate value and direct to signup
- "Ready to know where you show up?"

**Footer**
- "Surven" branding/logo (styled text if no image)
- Links: Pricing, Blog, Docs, Contact

---

### 2. Login / Sign Up Page (`/login` & `/signup`)

**Design Notes:**
- Clean, centered layout on desktop; full-screen on mobile
- Dark background (use primary background color)
- Single card with rounded corners (12–16px radius) containing form
- Form transitions smoothly between "Log In" and "Sign Up" modes

**Form Elements:**
- Email input + password input (with show/hide toggle on password)
- "Sign Up" has: Name + Email + Password + Confirm Password
- Submit button: Electric blue CTA
- Loading state: Button shows spinner, disabled during submission
- Error handling: Error message appears below field in orange/red

**Auth Integration:**
- Supabase auth via email + password
- Add option for Google OAuth (optional for future)

**Animation Details:**
- Form fields have focus state: subtle border color shift + background highlight
- Smooth error message slide-in from bottom
- Success redirect with subtle fade transition

---

### 3. Onboarding Page (`/onboarding`)

**Purpose:** Capture business details before first scan.

**Design:**
- Single-column centered layout
- Progressive disclosure: Don't overwhelm with all fields at once
- Each section animates in as user scrolls or focuses

**Form Sections:**

1. **Business Details**
   - Business Name (text input, required)
   - Industry/Category (searchable dropdown with common options: Dentist, Restaurant, Plumber, Marketing Agency, Real Estate Agent, Lawyer, Auto Mechanic, Salon, Gym, Accountant, etc.)
   - City (text input, required)
   - State (dropdown of US states, required)

2. **Competitors (Optional)**
   - "Add up to 3 competitors you want to compare against" (subheading)
   - Input fields with add/remove buttons
   - Each competitor field has subtle entrance animation

3. **Review & Submit**
   - Summary of entered data (read-only, nice formatting)
   - Button: "Start My First Scan" (electric blue, prominent)

**Animation Notes:**
- Form labels fade in and slide up as fields become active
- Helper text appears below inputs on focus
- Smooth transition between sections (fade + subtle slide)

---

### 4. Dashboard (`/dashboard`)

**This is the centerpiece of Surven.** It must feel polished, data-driven, and interactive.

#### 4A. Top Section: Visibility Score Gauge

**Layout:**
- Left side: Business name (large, 32px) + industry badge
- Right side: Large circular/semi-circular gauge showing Visibility Score (0–100)
- Below gauge: Score interpretation text + "Last scan: X hours ago" timestamp
- Action: "Run New Scan" button (electric blue, positioned near gauge or below)

**Gauge Appearance & Animation:**
- Circular progress indicator with gradient fill (electric blue to teal based on score)
- Color coding:
  - 0–25: Red (`#ef4444`)
  - 26–50: Orange (`#f97316`)
  - 51–75: Yellow-green (`#84cc16`)
  - 76–100: Teal (`#06d6a0`)
- On page load, gauge animates from 0 to final score over 1.2 seconds with smooth easing
- Center text shows numeric score + percentage
- Subtle glow effect around gauge when score is high (76+)

**Running a Scan:**
- When user clicks "Run New Scan," button shows spinner state
- Gauge briefly fades to a skeleton/shimmer
- Results animate back in once scan completes (with success toast notification)

---

#### 4B. AI Model Breakdown Section

**Layout:** Three columns (one per model: ChatGPT, Claude, Perplexity)

**Each Card Shows:**
- Model name + logo/icon (simple SVG)
- **Mentioned Count:** Large, bold text: "3/6 prompts" (or similar)
- Visual progress bar below count (filled portion in electric blue)
- Status badge: "Mentioned" (green/teal, filled) or "Not Found" (slate, outline)
- Subtle hover effect: Card background shifts slightly, shadow increases

**Animation:**
- Cards fade in and slide up on page load (staggered 50ms between cards)
- When new scan results come in, cards briefly pulse or highlight
- Progress bars animate their fill percentage on data update

---

#### 4C. Prompt Results Section

**Layout:** Collapsible/expandable accordion list

**Header (Always Visible):**
- "Prompt Results" title
- Small icon to collapse/expand all

**Each Prompt Item:**
- Prompt text displayed (e.g. "What are the best [industry] in [location]?")
- Three small indicators (checkmark or X) per AI model showing if business was mentioned
  - Checkmark (green/teal) = mentioned
  - X (red/orange) = not mentioned
- Expandable area showing:
  - Brief AI response snippet (2–3 sentences)
  - Business name highlighted if found (use teal background highlight)
  - Link to view full response (optional)

**Animation:**
- On expand, content slides down smoothly (200ms)
- Response text fades in as content expands
- Highlight animation: Brief pulse/glow on business name when result loads

---

#### 4D. Competitor Comparison Section (Conditional)

**Shows only if competitors were added during onboarding.**

**Layout:** Horizontal bar chart or simple table

**Chart/Table:**
- Your business on left/top (electric blue)
- Each competitor in different colors
- X-axis: Visibility Score (0–100)
- Shows count of prompts mentioned for each business

**Animation:**
- Bars animate in on page load, growing to their final width (600–800ms)
- On hover, bar highlights and shows exact count
- Comparison view includes text: "You appear in 4/6 prompts; Competitor A appears in 3/6"

**Alternative Table View (if preferred):**
- Business Name | Mentioned Prompts | Score
- Each row has subtle alternating background colors
- Your business row is highlighted (darker background)

---

#### 4E. History/Trending Section

**Layout:** Line chart showing visibility score over multiple scans

**Chart Details:**
- X-axis: Dates of scans (e.g. "Apr 1", "Apr 4", "Apr 7")
- Y-axis: Score (0–100)
- Line animates in on page load (drawing effect, 800–1200ms)
- Dots at each data point are interactive (hover shows exact score + date)
- Optional: Light gradient fill under the line

**Animation:**
- Line draws from left to right when page loads
- Dots appear with subtle scale-up animation
- On hover, tooltip fades in, dot enlarges slightly

**Interactive Insights (Optional):**
- If score is trending up: "Your visibility is improving! +15 points this week."
- If trending down: "Your visibility declined this week. Consider running another scan."
- Text animates in with a subtle slide + fade

---

### 5. Settings Page (`/settings`)

**Layout:** Sidebar navigation + content area (desktop) or tab-based (mobile)

**Sections:**

1. **Business Information**
   - Edit business name, industry, location
   - Edit competitor list
   - "Save Changes" button (electric blue)

2. **Account Settings**
   - Email (read-only or editable with verification flow)
   - Change password button
   - Account deletion (destructive, outlined button in orange/red)

3. **Plan & Billing**
   - Show "Free Plan" for MVP
   - Placeholder: "Upgrade to Pro" (future feature)

4. **API & Integrations**
   - Mention Google Stitch integration availability (for future)
   - Mention 21st.dev enrichment (for future)
   - Status indicators showing connected/disconnected

**Animation:**
- Form changes trigger subtle "unsaved changes" indicator
- On save, success toast appears (teal background)
- Delicate fade transitions between sections

---

## Interactive Animations & Scrolling Effects

### Page Load Animations
1. **Hero/Header fades in** (0–300ms, ease-out)
2. **Main content card slides up** (200–500ms, staggered)
3. **Data gauge animates to final value** (1–2s, smooth spring curve)
4. **Charts draw in** (500–1200ms, line-drawing effect)

### Scroll Reveal Animations
- **On landing page:** Cards fade + slide in as user scrolls into view
- **Parallax effect:** Optional subtle parallax on background or image elements (respect `prefers-reduced-motion`)

### Hover Effects
- **Cards:** Subtle background color shift, shadow increase, scale very slightly (1.02x)
- **Buttons:** Color darkening, shadow increase, internal icon animation (e.g., slight rotation or shift)
- **Chart elements:** Tooltip appears, bar/line highlighted, surrounding elements fade slightly

### Loading States
- **Scan in progress:** Gauge shows skeleton/shimmer, progress text updates ("Querying ChatGPT..." → "Querying Claude..." → "Querying Perplexity...")
- **Data loading:** Skeleton screens for cards, bars, text
- **Transitions:** Smooth fade between states (no jarring snaps)

### Success/Error Feedback
- **Success toast:** Teal background, checkmark icon, message fades in from bottom-right (500ms), auto-dismisses after 4s
- **Error toast:** Orange/red background, X icon, message fades in, stays until dismissed
- **Inline validation:** Form fields show red border + error text on blur if invalid

---

## Technology Integration

### 1. Google Stitch Integration (Future)
- Mention in Settings under "Integrations"
- Future capability: Connect Stitch for automated data warehousing of scan results
- Status indicator: "Not Connected" with "Connect Stitch" button

### 2. 21st.dev Integration (Future)
- Mention in Settings under "Integrations"
- Future capability: Use 21st.dev for enriching competitor data and discovering new competitors
- Status indicator: "Not Connected" with "Enable 21st.dev" button

### 3. UI/UX Pro Max Design System
- This entire design brief is informed by UI/UX Pro Max design intelligence:
  - **Style:** Minimalism with premium dark theme override
  - **Color:** Premium SaaS palette with electric blue + teal accents
  - **Typography:** Inter font family for clean, modern feel
  - **Components:** Dashboard cards, progress indicators, data visualizations
  - **Animations:** Micro-interactions following 150–300ms guidelines

---

## Technical Stack Recommendations

### Frontend Framework
- **React** (modern, component-based)
- **Next.js** (optional, for better performance and server-side capabilities)
- **TypeScript** (optional, for type safety)

### Styling & Animation
- **Tailwind CSS** for utility-first styling (use design tokens for colors, spacing)
- **Framer Motion** for smooth, spring-physics-based animations
- **Radix UI or Headless UI** for accessible form components

### Data Visualization
- **Recharts** for charts (line chart for history, bar chart for competitor comparison)
- **React-gauge-arc** or custom SVG for circular progress gauge

### State Management
- **React Context + Hooks** (sufficient for MVP)
- **Zustand** or **TanStack Query** (if needed for complex state)

### Database & Auth
- **Supabase** for PostgreSQL database + Supabase Auth (email + password)
- Tables: `users`, `businesses`, `competitors`, `scans`, `scan_results`

### Backend (MVP)
- **Mock scan engine** (separate module: `mockScanEngine.ts`)
  - Generates realistic-sounding prompts
  - Simulates AI responses with randomized business mentions (weighted probability ~40%)
  - Stores results in Supabase
  - Easy to swap for real APIs later (ChatGPT, Claude, Perplexity)

---

## Database Schema (Supabase)

```sql
-- users (handled by Supabase Auth)

-- businesses
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- competitors
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- scans
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  visibility_score INT CHECK (visibility_score >= 0 AND visibility_score <= 100),
  created_at TIMESTAMP DEFAULT now()
);

-- scan_results
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id),
  prompt_text TEXT NOT NULL,
  model_name TEXT NOT NULL, -- 'chatgpt', 'claude', 'perplexity'
  response_text TEXT,
  business_mentioned BOOLEAN DEFAULT FALSE,
  competitor_mentions JSONB, -- { "Competitor A": true, "Competitor B": false }
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Component Library Structure

### Core Components
- `Button` (primary, secondary, danger variants + loading state)
- `Input` (text, email, password with labels + error states)
- `Select` / `Dropdown`
- `Card` (reusable container with consistent shadows and corners)
- `Badge` (for status indicators: "Mentioned", "Not Found", etc.)
- `Toast` (success/error notifications)
- `Modal` / `Dialog`
- `Spinner` / `Skeleton`

### Data Viz Components
- `VisibilityGauge` (animated circular progress)
- `ModelBreakdownCard` (card showing model stats)
- `HistoryChart` (line chart with Recharts)
- `ComparisonChart` (bar chart for competitor comparison)

### Page Components
- `LandingHero`, `LandingFeatures`, `LandingFooter`
- `LoginForm`, `SignUpForm`
- `OnboardingForm`
- `DashboardHeader`, `DashboardGaugeSection`, `ModelBreakdownSection`, `PromptResultsSection`, `ComparisonSection`, `HistorySection`
- `SettingsNav`, `SettingsContent`

---

## MVP Scope & Priorities

### Phase 1 (MVP Launch)
✅ Landing page with compelling copy + hero CTA  
✅ Supabase auth (email + password sign up/login)  
✅ Onboarding flow (add business + optional competitors)  
✅ Dashboard with visibility gauge + mock scan results  
✅ AI model breakdown cards  
✅ Prompt results list  
✅ Settings page (edit business, account settings)  
✅ Mock scan engine (generates realistic prompts + responses)  
✅ Toast notifications (scan started, scan complete)  
✅ Responsive design (mobile + desktop)  
✅ Interactive animations (gauge, chart, card transitions)  

### Phase 2 (Future Enhancements)
🔄 Real API integration (ChatGPT, Claude, Perplexity)  
🔄 Competitor comparison chart  
🔄 Historical trends chart  
🔄 Google Stitch integration  
🔄 21st.dev competitor enrichment  
🔄 Billing & Pro plan  
🔄 Team collaboration features  
🔄 Export/reporting  

---

## Design Deliverables Checklist

Before handing off code for development:

- [ ] All colors match the premium dark palette (navy, electric blue, teal)
- [ ] Typography follows Inter font with consistent scale
- [ ] All interactive elements have hover states (150–250ms transitions)
- [ ] Animations respect `prefers-reduced-motion` setting
- [ ] All form fields have proper labels, error states, helper text
- [ ] Touch targets are ≥44×44px on mobile
- [ ] Charts include legends, tooltips, and accessible data labels
- [ ] Loading states show skeleton screens (not instant spinners)
- [ ] Success/error toasts auto-dismiss appropriately
- [ ] Focus states are visible for keyboard navigation
- [ ] Responsive design tested at 375px, 768px, 1024px, 1440px
- [ ] Dark mode contrast meets WCAG AA (4.5:1 for body text)
- [ ] All icons are SVG (Heroicons or Lucide)
- [ ] Page transitions are smooth (no jarring jumps)
- [ ] Data gauge animates on load with spring physics
- [ ] Charts draw in on load (line-drawing effect)

---

## Next Steps

1. **Design System Finalization**: Run this brief through UI/UX Pro Max for detailed component specifications and animation curves
2. **Wireframing**: Create low-fidelity wireframes for each page (desktop + mobile)
3. **Component Development**: Build foundational components (Button, Input, Card, Gauge)
4. **Page Implementation**: Assemble pages from components
5. **Animation Polish**: Add entrance animations, scroll reveals, interactions
6. **Testing**: Accessibility testing, mobile testing, animation smoothness
7. **Launch**: Deploy MVP with mock data; prepare for real API integration

---

## Notes for Implementation

- **Keep it modular:** Each page is a separate React component; each data viz is its own component
- **Reuse animations:** Define animation timings and easing curves as constants, use them consistently
- **Test early:** Animations can cause performance issues; profile and optimize
- **Prototype interactions:** Use Framer Motion or similar to prototype critical animations before full build
- **Accessibility first:** Add ARIA labels, focus states, and keyboard navigation from the start
- **Mock engine:** Clearly separate mock API from UI code for easy replacement later

---

**Surven is the future of visibility in the AI age. Let's build it beautifully.**
