# 11 — Sales & Onboarding (Features 73-76)

These features convert installs to paid accounts. The extension is the top of Surven's funnel — every interaction is a sales opportunity if framed right.

---

## Feature 73 — Demo Mode (Surven Showcase Site)

**What it does.** First-run experience: extension auto-audits a Surven-controlled demo site (e.g., `demo.surven.com`) to show every feature populated with rich, intentional examples. User can re-enter demo mode anytime.

**Why it matters for GEO.** Cold-start problem: a new user audits their own page first, finds 8 issues, gets discouraged. Demo mode shows them what "good" looks like first, then "now try your site".

**Technical implementation.**
- Build `demo.surven.com` — a small site with intentional examples of every finding type (perfect schema page, weak page with answer-capsule gap, JS-rendered SPA page, etc.).
- Extension on first install: opens `demo.surven.com/start`, auto-runs audit.
- "Demo Mode" toggle in settings to re-run anytime.

**External APIs.** None.

**Data flow.** Onboarding state → open demo site → run audit.

**UI/UX.** First-install splash: "Want to see what Surven can do? Try it on our demo site first." Big "Start Demo" button. Demo page has annotations.

**Build complexity.** Medium. ~16-24 hours (mostly content design for the demo site).

**Premium-worthiness.** Free tier (it's the conversion mechanism).

**Dependencies.** Demo site lives on Surven's domain.

**Competitor inspiration.** Stripe's demo dashboard, Linear's demo workspace. SaaS standard.

---

## Feature 74 — White-Label Mode for Agency Partners

**What it does.** Agency partners can rebrand the extension UI with their logo, colors, custom domain for the side panel. Reports/PDFs (feature 49) generate with agency branding.

**Why it matters for GEO.** Agencies (Surven's primary customers) need to deliver Surven-powered work as their own brand. White-label is a common upsell to enterprise tier.

**Technical implementation.**
- Settings: agency profile (logo URL, primary color, accent color, name, custom domain).
- Side panel reads from settings, applies CSS vars + logo.
- PDF templates accept theme.
- Custom domain: agency CNAMEs `audit.agencyname.com` to Surven; SSO via OAuth.

**External APIs.** None new.

**Data flow.** Settings → CSS vars → render. Custom domain via Surven backend.

**UI/UX.** Settings: "Agency Branding" panel with logo upload, color pickers, preview. "Enable white-label" toggle.

**Build complexity.** Medium-Large. ~24-32 hours including PDF theming.

**Premium-worthiness.** Enterprise tier ($499+/mo).

**Dependencies.** Backend agency profiles.

**Competitor inspiration.** AgencyAnalytics, BrightLocal, SE Ranking all do white-label. Standard agency upsell.

---

## Feature 75 — Lead Capture Form for Non-Surven Users

**What it does.** Users who haven't signed up still get a free per-domain audit, but to view full findings they enter email. Email triggers a sequence: welcome → free audit results PDF → upgrade nudge.

**Why it matters for GEO.** Maximizes top-of-funnel. Most installs won't sign up day 1; capture them for nurture.

**Technical implementation.**
- After audit, side panel shows top-3 findings free + 12 more "blurred". CTA: "Enter email to unlock all 15 findings + PDF".
- POST email to Surven CRM (HubSpot, Customer.io, or simple Postgres + Resend automation).
- Trigger 5-email drip: D0 results, D2 case study, D5 demo invite, D9 discount, D14 testimonial.

**External APIs.** Email service (Resend) + CRM (HubSpot or self-hosted).

**Data flow.** Email submit → CRM → drip → Stripe link on conversion.

**UI/UX.** Blurred findings with "Enter email to unlock". Single field + "Show me my full audit" button. Toast "Check your email for the full PDF".

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Free tier (it IS the lead capture).

**Dependencies.** Email + CRM, feature 49 (PDF).

**Competitor inspiration.** SEMrush, ahrefs all gate audits behind email. Universal SaaS pattern.

---

## Feature 76 — Free Tier Limits Visibly Displayed with Upgrade Nudges

**What it does.** Quotas (audits/day, simulations/day, PDFs/month) shown in the side panel header. Approaching the limit triggers a nudge ("3 of 5 audits used today — upgrade to Plus for unlimited"). Hitting the limit triggers an upgrade modal.

**Why it matters for GEO.** Friction at the right moment. Free users hit the wall when they're most engaged → highest conversion to paid.

**Technical implementation.**
- Backend tracks per-user quota (Postgres counters, reset daily/monthly via cron).
- Extension fetches quota state on side panel open + after each consuming action.
- Nudge component: appears when usage > 60%.
- Modal: appears when usage = 100%, blocks the action with "Upgrade to continue" CTA → Stripe checkout.

**External APIs.** Stripe (existing in Surven).

**Data flow.** Action → quota check → render → nudge or block.

**UI/UX.** Header: "5/5 audits today" usage bar. Side panel banner at 80%. Modal at 100%.

**Build complexity.** Small-Medium. ~12-14 hours.

**Premium-worthiness.** Conversion mechanism — it IS the upgrade path.

**Dependencies.** Backend quota counters, Stripe.

**Competitor inspiration.** Notion, Linear, every SaaS. Standard pattern.

---

## Cross-Cutting Notes

- **Onboarding sequence**. Day 0 = install + demo + first audit. Day 1 = email "your first findings". Day 3 = "did you try the citation probe?". Day 7 = invite to webinar. Map every feature to an onboarding milestone.
- **Activation metric**. Define "activated" as: ran 3 audits + sent 1 finding to Optimizer + at least one return session in 7 days. Track funnel from install → activated.
- **Soft paywalls beat hard ones**. Feature 76 should always show *what they're missing* rather than just blocking. "Upgrade to Plus to see the full citation probe results" with a blurred preview > a wall.
- **Affiliate program**. Worth considering for the agency tier (feature 74): agencies get 20% recurring commission for clients they sign up via the extension. Built-in viral loop.
