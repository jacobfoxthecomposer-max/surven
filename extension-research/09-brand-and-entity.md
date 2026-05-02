# 09 — Brand & Entity (Features 62-66)

Entities are the currency of AI search. AI engines build a knowledge graph of entities (brands, people, places, products) and prefer to cite pages that strongly associate with the right entities. This tier audits and strengthens the brand-entity signal.

---

## Feature 62 — Entity Association Strength

**What it does.** For the configured client brand, scores how strongly the page associates the brand with its key topics/categories. E.g., does Acme.com/coffee actually establish Acme = coffee brand, or does it bury the brand association under generic content?

**Why it matters for GEO.** AI engines won't cite Acme for "best coffee" if the page doesn't aggressively associate Acme + coffee + quality signals. Weak association = invisible.

**Technical implementation.**
- Define brand keywords + category keywords in settings.
- Run NER (winkNLP) on page → entity spans.
- For each `(brand, category)` pair, count co-occurrences within the same paragraph and within proximity windows.
- Score: brand mentions × category mentions × proximity factor / page length.
- Compare to benchmark: similar pages from competitors.

**External APIs.** None for scoring. winkNLP local.

**Data flow.** Page text + brand config → NER → co-occurrence matrix → score → side panel.

**UI/UX.** "Entity Association" card: brand-category pairs with strength bars. Click → shows highlighted co-occurrences in page.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 10 (entity overlay), brand settings.

**Competitor inspiration.** InLinks does entity SEO. None do per-page brand-association strength scoring.

---

## Feature 63 — Co-Occurrence Analyzer

**What it does.** Lists which other entities the brand most often co-occurs with on the page. Flags unwanted co-occurrences (competitor, off-brand topics) and weak desired co-occurrences.

**Why it matters for GEO.** AI engines build associations transitively. If Acme always co-occurs with "expensive", the brand inherits "expensive" in AI memory.

**Technical implementation.**
- From feature 10 NER output, build co-occurrence matrix per paragraph window.
- Sort entities by co-occurrence frequency with brand.
- User flags desired vs. undesired terms.

**External APIs.** None.

**Data flow.** NER → co-occurrence → ranked list → side panel.

**UI/UX.** "Co-Occurrences" panel: ranked list with sentiment chips (desired/neutral/undesired).

**Build complexity.** Small (rolls in with feature 62). ~6 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 10, 62.

**Competitor inspiration.** Brandwatch / Talkwalker do this for social. Not standard in SEO/GEO yet.

---

## Feature 64 — NAP Consistency Check (Name / Address / Phone)

**What it does.** Verifies that business Name, Address, Phone on the page exactly match: (a) the LocalBusiness schema, (b) Google Business Profile, (c) major directories (Yelp, Facebook).

**Why it matters for GEO.** Local AI queries ("best plumber in Austin") cross-reference NAP across sources. Mismatch = AI hesitates to recommend.

**Technical implementation.**
- Extract NAP from page (heuristic: footer addresses, contact pages, schema).
- Pull canonical NAP from settings.
- Optional: integrate Synup/BrightLocal API for live directory check (per CLAUDE.md memory, Surven is researching directory automation — this is a touchpoint).

**External APIs.** Optional: Google Places API ($17/1k requests for Place Details), or Synup/BrightLocal subscriptions.

**Data flow.** Page NAP + canonical NAP → diff → side panel.

**UI/UX.** "NAP" row: ✓ if all match, ⚠️ with diff if not. Lists each source.

**Build complexity.** Small (page-only). Medium with directory integration. ~6-20 hours.

**Premium-worthiness.** Premium (Local SEO clients).

**Dependencies.** Settings for canonical NAP. Directory API for live check.

**Competitor inspiration.** Whitespark, BrightLocal, Yext. Surven differentiator: in-browser per-page check.

---

## Feature 65 — Social Proof Detector

**What it does.** Scans page for testimonials, ratings, review counts, customer logos, case study links, certifications. Reports presence/absence + extracts the signals to feed into Review/AggregateRating schema (feature 14).

**Why it matters for GEO.** AI engines surface social proof signals heavily ("highly rated", "trusted by 10,000 customers"). Missing on-page = missing in AI answers.

**Technical implementation.**
- Heuristics:
  - Star ratings: regex `[★⭐]{1,5}`, image alt-text "star", icon class names.
  - Review counts: regex `\d+,?\d*\s+(reviews|ratings|customers|users)`.
  - Testimonial patterns: `<blockquote>` near person name + photo.
  - Customer logos: image grids with `alt="<brand>"` or `class*="logo"`.
- Report findings + suggest schema.

**External APIs.** None.

**Data flow.** DOM heuristic scan → social proof inventory → side panel.

**UI/UX.** "Social Proof" card: counts of each type + "Generate AggregateRating schema" CTA.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Feature 14 for schema generation.

**Competitor inspiration.** Schema App generates Review schema. None proactively detect on-page social proof.

---

## Feature 66 — Author Byline + E-E-A-T Scanner

**What it does.** Detects author byline, author bio, author credentials. Scores E-E-A-T (Experience, Expertise, Authority, Trustworthiness) signals: linked author profile, sameAs (LinkedIn/Twitter), credentials, publish/update date, fact-check claims.

**Why it matters for GEO.** Google's E-E-A-T directly informs AIO ranking. AI engines elsewhere also use author signals as trust proxies.

**Technical implementation.**
- Extract: `<meta name="author">`, `rel="author"`, JSON-LD `author` field, byline DOM patterns near H1.
- Check: does author have own page? sameAs links? Credentials/title?
- Score on E-E-A-T rubric.

**External APIs.** None.

**Data flow.** DOM author signals → E-E-A-T checklist → side panel.

**UI/UX.** "E-E-A-T" panel: checklist with ✓/✗ + suggestions ("Add author bio with credentials and LinkedIn link").

**Build complexity.** Medium. ~12-16 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** None.

**Competitor inspiration.** Originality.ai, MarketMuse touch on E-E-A-T. Standard SEO concept.

---

## Cross-Cutting Notes

- **Brand settings UI**. Single "Brand Profile" object: name, aliases, NAP, key competitors, key categories, industry. Used by features 7, 10, 24, 62, 63, 64.
- **Entity database**. For long-term value, Surven could build a per-client entity knowledge graph stored in backend, updated each audit. Then "show how Acme's entity associations changed this quarter" becomes a Tracker dashboard.
- **NER accuracy**. winkNLP is good but not great at domain-specific entities (B2B SaaS product names, niche brands). For high-stakes audits, fall back to a Sonnet structured-output call to extract custom entities.
