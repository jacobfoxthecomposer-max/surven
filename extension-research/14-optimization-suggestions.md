# 14 — Optimization Suggestions (Features 85-89)

The recommendation layer. Findings are diagnostic; this tier is prescriptive — what to do, in what order, with what expected impact.

---

## Feature 85 — "Best 3 Fixes for Max Impact" Ranked by Effort × Impact

**What it does.** From all findings on a page (or a site), surfaces the top 3 by `(predicted impact / effort)` ratio. Cuts through analysis paralysis.

**Why it matters for GEO.** Most audits return 30+ findings. Most clients fix 0 because they don't know where to start. The top-3 view forces prioritization.

**Technical implementation.**
- Each finding type has a static `(impact, effort)` tuple maintained in config:
  - "Add answer capsule": impact 9, effort 3
  - "Add LocalBusiness schema": impact 8, effort 2
  - "Fix robots.txt blocking ClaudeBot": impact 10, effort 1
  - "Rewrite all paragraphs": impact 6, effort 9
  - etc. (~50 finding types × 2 numbers)
- Composite: `score = impact / effort × severity_multiplier`.
- Sort + take top 3.
- Show with "expected lift" (feature 86) and "approximate time".

**External APIs.** None.

**Data flow.** Findings list → impact/effort lookup → ranked → top 3 → side panel.

**UI/UX.** Top of side panel: "Do these 3 first" cards with expected score lift.

**Build complexity.** Small. ~6-8 hours (most work is calibrating the impact/effort tuples).

**Premium-worthiness.** Free tier.

**Dependencies.** All finding types must have tuples assigned.

**Competitor inspiration.** Lighthouse "Opportunities" sorts by estimated savings. Same pattern, GEO-applied.

---

## Feature 86 — Estimated Visibility Lift Per Fix

**What it does.** For each suggested fix, estimates the score lift (e.g., "+8 points") if applied.

**Why it matters for GEO.** Quantifies value. "Apply this fix → score goes 67 → 75" is more motivating than "do this".

**Technical implementation.**
- Each finding type has a `pointsContribution` (the points it would add to feature 6's composite score if fixed).
- Show alongside each finding.
- For LLM-rewrite fixes, simulate: re-score the proposed paragraph and show delta.

**External APIs.** None for static. Optional Sonnet for re-scoring rewrites (cost ~$0.001 per).

**Data flow.** Finding → contribution lookup → render delta.

**UI/UX.** Each fix card shows "+8 visibility" pill in green.

**Build complexity.** Small. ~4-6 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Feature 6 score formula stable.

**Competitor inspiration.** PageSpeed Insights estimates savings per opportunity. Same pattern.

---

## Feature 87 — Industry Benchmarks

**What it does.** Shows where the page's score sits relative to its industry. "Your score: 67. Industry median: 54. Top quartile: 78."

**Why it matters for GEO.** Context. A 67 means nothing in isolation; a 67 in a category where median is 54 feels like a win.

**Technical implementation.**
- Backend aggregates audited URLs by category (feature 28's category classifier).
- Compute percentiles per category nightly.
- Extension queries `/api/benchmarks/:category` → returns median/p25/p75/p90.

**External APIs.** None (Surven data lake).

**Data flow.** Category → backend percentiles → side panel chart.

**UI/UX.** Bell curve mini-chart with current page marked. "Top 32% in B2B SaaS / CRM".

**Build complexity.** Medium. ~14-16 hours (mostly the data aggregation pipeline).

**Premium-worthiness.** Plus tier.

**Dependencies.** Audit data at scale (chicken-and-egg early on; bootstrap by running audits on top 1000 sites per category at launch).

**Competitor inspiration.** Lighthouse compares against HTTP Archive. SimilarWeb shows industry rank. Surven angle: GEO-specific.

---

## Feature 88 — Goal Setting + Progress Tracking

**What it does.** User sets a goal: "Get acme.com/pricing from score 47 to 75 in 30 days". Surven tracks progress, sends weekly check-ins.

**Why it matters for GEO.** Behavioral hook. Goals + progress = engagement loop. Replaces ad-hoc auditing with intentional improvement.

**Technical implementation.**
- Goal table: `{id, userId, url, currentScore, targetScore, deadline, createdAt}`.
- Daily cron checks audit history → updates progress.
- Weekly email + extension notification.

**External APIs.** Email.

**Data flow.** Goal create → cron check → progress update → notification.

**UI/UX.** "Goals" tab listing active goals with progress bars. Create goal modal. Goal completion celebration.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Audit snapshots, email.

**Competitor inspiration.** OKR tools (Lattice, 15Five). Habitica. Standard pattern, GEO-applied.

---

## Feature 89 — A/B Test Mode

**What it does.** User saves "version A" of a page (snapshot of current state). Implements changes. Re-audits as "version B". Compares scores side-by-side. Optional: connect to Google Optimize / VWO to track real-world citation lift.

**Why it matters for GEO.** Validates that fixes actually move the needle. Closes the feedback loop from "made changes" to "did it work".

**Technical implementation.**
- "Save as version A" button → snapshots full audit + page HTML.
- After changes, "Save as version B" → snapshots again.
- Diff view: scores, findings closed/added, paragraph-level diff.
- Optional integration: GA4/Plausible event ingestion to track AI referrer traffic.

**External APIs.** None primary. Optional: Google Analytics Data API.

**Data flow.** Snapshot A → user edits → snapshot B → diff view.

**UI/UX.** "A/B" tab. Two-column compare with clear labels. "Promote B → mark fix verified" button.

**Build complexity.** Medium-Large. ~24-28 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Snapshot storage, feature 32 diff infra.

**Competitor inspiration.** A/B testing tools (Optimizely, VWO) for conversion. None for GEO. Genuinely novel positioning.

---

## Cross-Cutting Notes

- **Calibration is everything.** Features 85-87 only work if score formulas are stable and impact/effort tuples are accurate. Treat the score formula as a versioned product (v1.0, v1.1) and document changes.
- **Show, don't tell.** Whenever possible, fix-suggestions should include a *preview* of the fixed state. "Here's what your H2 + answer capsule will look like" is 10× more persuasive than "add an answer capsule".
- **Celebration UX.** When a goal is hit or score crosses a threshold, fire a tasteful confetti or success state. Behavioral retention.
- **Long-term**: consider an "auto-pilot" mode where Surven Optimizer applies fixes directly to client CMSes (WordPress plugin, Webflow CMS API, headless commerce) — closes the entire loop from finding → fix → verification with no human in the middle. That's the eventual vision per the Optimizer charter.
