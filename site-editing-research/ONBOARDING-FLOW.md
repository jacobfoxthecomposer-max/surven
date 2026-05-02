# Onboarding Connect Flow

Decision: 2026-05-02. Captures the post-Premium connect flow that triggers right after a user upgrades.

---

## The Trigger

Connection happens **after Premium purchase**, not at signup.

```
Stripe webhook: customer.subscription.created
  ↓
Mark user_profiles.plan = 'premium'
  ↓
Next page load: redirect to /onboarding/connect
  ↓
Picker → per-platform info form → POST /api/integrations/connect
  ↓
/dashboard with connection live across every audit tool
```

**Why post-Premium, not at signup:**
- Highest-conversion moment in the funnel (just paid → motivated)
- Connection IS the Premium benefit, so the gate makes sense
- Eliminates "should I connect now?" decision fatigue at signup
- Free users still get read-only audits via paste-a-URL flow — no value lost

---

## The Picker

One UI, search-first, with all platforms visible from day one.

```
┌─────────────────────────────────────────────────┐
│  Connect your website                            │
│                                                  │
│  🔍 [ Type your website URL ]                    │
│     Surven detects your platform automatically   │
│                                                  │
│  Or pick your platform:                          │
│  [GitHub ✓]  [WordPress 🔒]  [Shopify 🔒]        │
│  [Webflow 🔒]  [Vercel ✓]                        │
│                                                  │
│  Don't have a site? [Skip — set up later]        │
└─────────────────────────────────────────────────┘
```

**Tile states by phase:**
- ✓ = clickable now
- 🔒 = "Coming Phase X" tooltip, greyed out
- Phase 1: GitHub + Vercel clickable
- Phase 2: + WordPress
- Phase 3: + Shopify
- Phase 5: + Webflow + headless CMSs

**Why show locked tiles:** sets expectations, creates anticipation, shows the platform isn't a single-vendor toy. The picker UI is built once, tiles enable progressively.

---

## Auto-Detect (the wow moment)

When user pastes a URL into the search bar, Surven runs the framework detection service (Phase 0) and pre-selects the right tile:

```
Input: "acme.com"
  ↓
HTTP probe → headers, HTML, key files
  ↓
"Detected: Next.js on Vercel + WordPress backend"
  ↓
Pre-select GitHub (for Next.js code) + Vercel + WordPress tiles
```

User can override but defaults are right ~95% of the time per detection research.

---

## Per-Platform Forms

After tile selection, route to a focused single-purpose form:

| Platform | Fields |
|----------|--------|
| GitHub | Token + repo (auto-detect default branch) |
| Vercel | Token + project ID |
| WordPress | Site URL + username + application password |
| Shopify | OAuth (1 click via app install) |
| Webflow | Token + site ID |

Each form calls existing `POST /api/integrations/connect` with the validated payload. No new backend needed for v1.

---

## Business Scoping

Connections are scoped by `business_id`, not `user_id`. Users may have multiple businesses tracked.

**Default behavior:**
- Auto-pick the user's first business
- Show a switch line at top: *"Connecting for **Acme Coffee** — switch business?"*
- Switch link opens a dropdown of the user's businesses

**Why auto-pick:** right answer 90% of the time, escape hatch when wrong, zero extra screens for the common case.

---

## Skip Path

Users can skip the post-Premium connect flow without losing the entry point. "Skip — set up later" routes to `/dashboard` with a persistent banner: *"Connect your site to unlock fixes →"* linking to `/settings/integrations`.

The picker is reusable from `/settings/integrations` — same component, different trigger.

---

## What This Changes About Phase 1

Phase 1's roadmap entry "Dashboard: Connect GitHub → site detection → audit → propose-fix list → approval UI" becomes:

1. **Stripe webhook** marks plan = premium
2. **Post-Premium redirect** → `/onboarding/connect`
3. **Picker** with auto-detect (uses Phase 0 detection service)
4. **GitHub form** → existing `/api/integrations/connect`
5. **First-scan job enqueued** (uses Phase 0 job queue)
6. **Dashboard** shows connection + first-scan progress
7. **Audit results → propose-fix list → approval UI** as originally scoped

Connect flow becomes the headline UX of Phase 1, not a bolt-on settings page.

---

## Cross-References

- [BUILD-ROADMAP.md](BUILD-ROADMAP.md) — Phase 1 scope
- [12-framework-detection.md](12-framework-detection.md) — auto-detect logic
- [05-github-integration.md](05-github-integration.md) — GitHub-specific connection details
- [PREMIUM-TIERING.md](../extension-research/PREMIUM-TIERING.md) — what Premium actually unlocks
