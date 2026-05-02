# Premium Tiering Recommendation

How to slice the 89 features across Free, Plus ($49/mo), Premium ($199/mo), and Enterprise ($499+/mo). Optimized for: (a) Free converts to Plus quickly, (b) Plus → Premium step-up clearly worth the 4× price, (c) Enterprise unlocks agency/multi-seat scale.

## Tiering Matrix

| # | Feature | Free | Plus | Premium | Enterprise |
|---|---------|:---:|:---:|:---:|:---:|
| 1 | Multi-engine prompt simulator | 5/day | 100/day | unlimited (soft) | unlimited |
| 2 | Citation Probe | 1/day | 25/day | unlimited | unlimited |
| 3 | Auto-prompt generator | ✓ | ✓ | ✓ | ✓ |
| 4 | Engine Diff View | — | ✓ | ✓ | ✓ |
| 5 | "What would AI quote" | — | 5/day | unlimited | unlimited |
| 6 | Visibility score badge | ✓ | ✓ | ✓ | ✓ |
| 7 | Brand mention counter | — | ✓ | ✓ | ✓ |
| 8 | Heatmap overlay | ✓ | ✓ | ✓ | ✓ |
| 9 | Per-paragraph quote score | ✓ | ✓ | ✓ | ✓ |
| 10 | Entity overlay | — | ✓ | ✓ | ✓ |
| 11 | Answer-capsule detector | ✓ | ✓ | ✓ | ✓ |
| 12 | Q&A block detector | ✓ | ✓ | ✓ | ✓ |
| 13 | Schema visibility overlay | partial | ✓ | ✓ | ✓ |
| 14 | JSON-LD generator | — | 3/day | unlimited | unlimited |
| 15 | llms.txt builder | 1 generation | unlimited | unlimited | unlimited |
| 16 | Capsule rewriter | 3/day | 25/day | unlimited | unlimited |
| 17 | Meta description rewriter | — | ✓ | ✓ | ✓ |
| 18 | Title rewriter | — | ✓ | ✓ | ✓ |
| 19 | FAQ generator | — | — | ✓ | ✓ |
| 20 | HowTo generator | — | — | ✓ | ✓ |
| 21 | Alt-text generator | 10 imgs/day | 100 imgs/day | unlimited | unlimited |
| 22 | Canonical fixer | ✓ | ✓ | ✓ | ✓ |
| 23 | OG/Twitter generator | — | ✓ | ✓ | ✓ |
| 24 | Competitor Compare Mode | — | 1 competitor | 3 competitors | 10 competitors |
| 25 | Citation gap on this page | — | — | ✓ | ✓ |
| 26 | "Steal their schema" | — | — | ✓ | ✓ |
| 27 | SERP vs AI dual view | — | — | ✓ | ✓ |
| 28 | Top-of-AI tracker | — | — | ✓ | ✓ |
| 29 | Competitor freshness | — | — | ✓ | ✓ |
| 30 | Send to Optimizer | — | — | ✓ | ✓ |
| 31 | Add as client | — | — | — | ✓ (agency only) |
| 32 | Historical diff | — | 30 days | 1 year | unlimited |
| 33 | Push to Tracker | — | — | ✓ | ✓ |
| 34 | Last-modified detector | ✓ | ✓ | ✓ | ✓ |
| 35 | Stale content scanner | — | — | ✓ | ✓ |
| 36 | Page age badge | ✓ | ✓ | ✓ | ✓ |
| 37 | Site-wide crawl trigger | — | 25 pages | 100 pages | 1000 pages |
| 38 | Broken citation finder | — | ✓ | ✓ | ✓ |
| 39 | Sitemap validator | ✓ | ✓ | ✓ | ✓ |
| 40 | Robots.txt analyzer | ✓ | ✓ | ✓ | ✓ |
| 41 | Page speed score | ✓ | ✓ | ✓ | ✓ |
| 42 | Bulk-audit all open tabs | 5 tabs | unlimited | unlimited | unlimited |
| 43 | Audit any URL without visiting | — | — | ✓ | ✓ |
| 44 | Right-click "Audit this link" | — | — | ✓ | ✓ |
| 45 | Right-click "Probe this text" | — | ✓ | ✓ | ✓ |
| 46 | Keyboard shortcuts | ✓ | ✓ | ✓ | ✓ |
| 47 | Audit history (50/unlimited) | 50 local | unlimited | unlimited | unlimited |
| 48 | Pin/star findings | ✓ | ✓ | ✓ | ✓ |
| 49 | Export PDF | 1/month | unlimited | unlimited (white-label) | unlimited (white-label) |
| 50 | Export CSV | ✓ | ✓ | ✓ | ✓ |
| 51 | Scheduled re-audit | — | — | ✓ | ✓ |
| 52 | Slack/email digest | — | — | ✓ | ✓ |
| 53 | Public shareable link | — | — | ✓ | ✓ |
| 54 | Reading level scorer | ✓ | ✓ | ✓ | ✓ |
| 55 | Sentence length analyzer | ✓ | ✓ | ✓ | ✓ |
| 56 | Hedge-word detector | ✓ | ✓ | ✓ | ✓ |
| 57 | POV consistency | — | ✓ | ✓ | ✓ |
| 58 | Internal link map | — | — | ✓ | ✓ |
| 59 | External citation map | — | ✓ | ✓ | ✓ |
| 60 | Content depth score | — | ✓ | ✓ | ✓ |
| 61 | Topic coverage gap | — | — | ✓ | ✓ |
| 62 | Entity association strength | — | — | ✓ | ✓ |
| 63 | Co-occurrence analyzer | — | — | ✓ | ✓ |
| 64 | NAP consistency | — | — | ✓ | ✓ |
| 65 | Social proof detector | — | ✓ | ✓ | ✓ |
| 66 | Author / E-E-A-T scanner | — | ✓ | ✓ | ✓ |
| 67 | llms-full.txt generator | — | — | ✓ | ✓ |
| 68 | AI bot access audit | — | ✓ | ✓ | ✓ |
| 69 | Server-rendered vs JS detector | — | ✓ | ✓ | ✓ |
| 70 | Crawl-blocking JS flag | — | ✓ | ✓ | ✓ |
| 71 | Hreflang validator | — | ✓ | ✓ | ✓ |
| 72 | Structured data testing tool | — | ✓ | ✓ | ✓ |
| 73 | Demo mode | ✓ | ✓ | ✓ | ✓ |
| 74 | White-label mode | — | — | — | ✓ |
| 75 | Lead capture form | (not gated) | (off) | (off) | (off) |
| 76 | Free tier limits visible | ✓ | ✓ | ✓ | ✓ |
| 77 | Floating mini-dashboard | ✓ | ✓ | ✓ | ✓ |
| 78 | Trend sparkline | — | ✓ | ✓ | ✓ |
| 79 | Citation source timeline | — | — | ✓ | ✓ |
| 80 | Notification badges | ✓ | ✓ | ✓ | ✓ |
| 81 | Comments on findings | — | — | ✓ | ✓ |
| 82 | Assign findings | — | — | ✓ | ✓ |
| 83 | Findings status | — | ✓ | ✓ | ✓ |
| 84 | Client portal | — | — | — | ✓ |
| 85 | Best 3 fixes | ✓ | ✓ | ✓ | ✓ |
| 86 | Estimated lift per fix | ✓ | ✓ | ✓ | ✓ |
| 87 | Industry benchmarks | — | ✓ | ✓ | ✓ |
| 88 | Goal setting | — | ✓ | ✓ | ✓ |
| 89 | A/B test mode | — | — | ✓ | ✓ |

## Tier Summary

### Free
- The lead-gen tier. Heatmap, basic schema, freshness, bot/sitemap checks, demo mode, badge, sparse simulator/probe quotas.
- **Goal**: install → "wow" → email capture → drip → upgrade.
- **Quotas hit**: simulator at 5/day, probe at 1/day, schema generator gated entirely → modal nudges to Plus.

### Plus ($49/mo) — Solo Operator
- Generous quotas on everything in Free + unlocks: simulator (100/day), probe (25/day), schema generators (1/day FAQ free), most rewriters, entity overlay, bot access audit, JS-render detection, sparklines, basic competitor (1).
- **Goal**: solo SEO/GEO consultant has everything they need for client work.

### Premium ($199/mo) — In-House GEO Team
- All daily-use features unlocked, real competitive intel (gap, leaderboard, freshness compare), Tracker/Optimizer integration, scheduled audits, digest emails, A/B mode, multi-seat (~5 seats included).
- **Goal**: in-house team or 1-3 person agency. Full GEO platform replacement.

### Enterprise ($499+/mo) — Agency / Resale
- Adds white-label, client portal, "add as client", 10 competitors, 1000-page crawls, audit logging, agency branding on PDFs.
- **Goal**: agencies running Surven across many client accounts, often resold under their brand.

## Pricing Psychology

- The Free → Plus jump is friction-free (low price, immediate value).
- The Plus → Premium jump (4×) is justified by Tracker/Optimizer integration + competitive intel (the high-cost LLM features) + collaboration.
- The Premium → Enterprise jump (~2.5×) is justified by white-label + portal — concrete agency-revenue features.

## Promotional Levers

- **First 7 days Premium free** on signup (auto-downgrade to Plus). Captures the high-engagement cohort.
- **Annual discount** (2 months free) — improves cash and locks in.
- **Agency partner program** (Enterprise tier discount + revenue share for sub-clients).
- **Educational/nonprofit** at 50% off Plus — not a real revenue stream but generates testimonials.
