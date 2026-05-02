# 08 — Content Analysis (Features 54-61)

Quality signals. AI engines bias toward content that's clear, well-structured, internally linked, and dense with citations. This tier surfaces those quality dimensions.

---

## Feature 54 — Reading Level Scorer (Flesch-Kincaid)

**What it does.** Scores the page's content on Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog, SMOG.

**Why it matters for GEO.** AI engines prefer Grade 8-12 reading level for general topics. Industry/technical can be higher. Wildly off = signal of either fluff or jargon — both hurt extraction.

**Technical implementation.**
- Use `text-readability` NPM (~5KB, runs in content script).
- Extract main article text via Mozilla Readability.js (avoid scoring nav/footer).
- Compute all 4 metrics.

**External APIs.** None.

**Data flow.** Article text → text-readability → scores → side panel.

**UI/UX.** "Readability" row: "Grade 11 (target: 8-12 ✓)" with all 4 sub-scores expandable.

**Build complexity.** Small. ~6 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Mozilla Readability.js.

**Competitor inspiration.** Hemingway, Yoast, Surfer all do this.

---

## Feature 55 — Sentence Length Analyzer

**What it does.** Distribution of sentence lengths. Flags paragraphs with average >25 words (too dense for AI extraction) and identifies specific long sentences for rewriting.

**Why it matters for GEO.** Long sentences fragment poorly when AI extracts quotes. Sweet spot: 15-22 words.

**Technical implementation.**
- Tokenize sentences (winkNLP `sbd`).
- Compute lengths, plot histogram.
- Highlight outlier sentences in page (>40 words).

**External APIs.** None.

**Data flow.** Article → sentences → stats → side panel histogram + in-page highlights.

**UI/UX.** Histogram chart. List of "longest 5 sentences" with rewrite suggestion.

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** winkNLP (also used by feature 10).

**Competitor inspiration.** Hemingway. Surfer.

---

## Feature 56 — Hedge-Word Detector

**What it does.** Counts and highlights hedge words ("might", "could", "perhaps", "may", "possibly", "approximately", "roughly") and weasel phrases ("some experts say", "many believe").

**Why it matters for GEO.** AI engines prefer declarative claims for citation. Hedged content is lower-confidence and gets passed over.

**Technical implementation.**
- Maintained word list (~50 entries).
- Regex with word boundaries.
- Highlight in-page + count summary.

**External APIs.** None.

**Data flow.** Text → regex match → counts + spans → side panel + highlights.

**UI/UX.** "Hedge words: 23" row with breakdown by word. Toggle "Highlight hedge words" overlays them in yellow.

**Build complexity.** Small. ~4 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** None.

**Competitor inspiration.** Hemingway flags adverbs/passives. Hedge-word framing is GEO-specific.

---

## Feature 57 — Voice/POV Consistency Check

**What it does.** Detects whether the page mixes first/second/third person inconsistently. AI extracts cleaner from consistent POV.

**Why it matters for GEO.** "We help you grow" then "Acme helps customers" in same paragraph is confusing for AI extraction.

**Technical implementation.**
- Tokenize, count pronouns by category per paragraph.
- Flag paragraphs with >1 dominant POV.

**External APIs.** None.

**Data flow.** Text → pronoun counts → flagged paragraphs.

**UI/UX.** "POV Consistency: 3 paragraphs mix first and third person" with click-to-highlight.

**Build complexity.** Small. ~6 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Tokenizer (winkNLP).

**Competitor inspiration.** Style tools (ProWritingAid, Grammarly Premium). Not standard in SEO.

---

## Feature 58 — Internal Link Map Visualization

**What it does.** Visualizes the internal link graph for the current page (inbound + outbound links to other pages on same domain).

**Why it matters for GEO.** Topical authority. Pages with strong internal link clusters get cited more by AI as the "canonical" source on a topic.

**Technical implementation.**
- Crawl the site (use cached crawl from feature 37 if available).
- Build adjacency list of page URLs and link counts.
- Render with D3 or react-force-graph (force-directed).

**External APIs.** None.

**Data flow.** Site crawl → adjacency list → graph render.

**UI/UX.** "Link Map" tab. Force-directed graph, current page highlighted. Hover any node for URL + score.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Site crawl.

**Competitor inspiration.** Sitebulb, Screaming Frog visualize this. Differentiator: GEO scoring per node.

---

## Feature 59 — External Citation Map

**What it does.** Inverse of feature 58: shows all outbound citations + which external domains the page links to.

**Why it matters for GEO.** Pages that cite authoritative sources are themselves seen as more authoritative by AI. Pages with no outbound citations look like marketing fluff.

**Technical implementation.**
- Extract all `<a href>` outbound from current page.
- Group by domain.
- Score domain authority (use Ahrefs DR / Moz DA via API, OR a simple heuristic: known authoritative TLDs `.gov`, `.edu`, NPM/npmjs/wikipedia/major news whitelist).

**External APIs.** Optional: Ahrefs API (expensive), Moz Links API ($), or use free heuristics.

**Data flow.** Outbound links → grouping → score → display.

**UI/UX.** "External Citations" panel: bar chart by domain with authority badge.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** None for heuristic version.

**Competitor inspiration.** ahrefs, Moz. GEO framing: focus on citation chain.

---

## Feature 60 — Content Depth Score

**What it does.** Composite metric: word count + heading depth + entity density + outbound citations + internal link cluster size + presence of unique data/research.

**Why it matters for GEO.** "Depth" is a real but fuzzy signal AI engines use. Surfacing it as a score helps clients prioritize "thin" pages for expansion.

**Technical implementation.**
- Combine signals from features 8, 10, 54, 58, 59.
- Calibrate against a known-good benchmark (e.g., top-cited Wikipedia pages = 90+).

**External APIs.** None.

**Data flow.** Existing per-feature signals → aggregator → depth score.

**UI/UX.** Single number 0-100 with sub-score breakdown bar.

**Build complexity.** Small (rolls in with existing signals). ~6 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Features 8, 10, 54, 58, 59.

**Competitor inspiration.** Surfer's Content Score, Frase's Topic Score. GEO angle: weight on entities and citations.

---

## Feature 61 — Topic Coverage Gap

**What it does.** For the page's primary topic (auto-detected), lists subtopics commonly covered by competitive pages but missing on this one.

**Why it matters for GEO.** AI engines extract from the most-comprehensive page. A page missing 3 of 8 expected subtopics will lose to a more thorough competitor.

**Technical implementation.**
- Use SerpAPI to get top-10 competing URLs for the page's primary keyword.
- Backend fetches competitor pages, extracts their H2/H3 headings.
- Sonnet aggregates: "These pages cover topics X, Y, Z, ..." → list of recurring subtopics.
- Compare to current page's headings → gap.

**External APIs.** SerpAPI ($25/1k). Sonnet ($3/$15) for aggregation.

**Data flow.** Page topic → SerpAPI → competitor headings → Sonnet → gap list → side panel.

**UI/UX.** "Topic Coverage" panel: checklist of expected subtopics with ✓ or ✗ on this page. Missing ones get a "Generate this section" CTA (calls feature 16-style rewriter for the section).

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** SerpAPI, Sonnet.

**Competitor inspiration.** Frase Brief Builder, Surfer Content Editor, Clearscope. Long-established pattern; Surven's GEO angle is the one differentiator.

---

## Cross-Cutting Notes

- **Mozilla Readability.js** (~25KB) is the single most useful library here — it isolates main article text from page chrome, used by Firefox Reader View and Pocket. Bundle into content script.
- **Aggregate signals into score formula.** Don't show users 12 sub-scores — show one number plus an expandable "why". Reduces cognitive load.
- **Calibrate, calibrate.** Pick 50 known-cited URLs (top Wikipedia, top Stack Overflow, top product pages) and run them through the scorer. Adjust weights so they score 80+. This makes the score trustworthy.
