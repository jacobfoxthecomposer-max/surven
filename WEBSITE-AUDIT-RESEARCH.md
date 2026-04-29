# Website Audit & Analysis Feature — Research & Reference

**Date:** 2026-04-27  
**Status:** Design phase  
**Next Review:** Before implementation starts

---

## Key Decisions & Rationale

### 1. Server-Side Crawling vs. Client-Side Rendering

**Decision:** Server-side crawling with Node.js fetch API (not Playwright/Puppeteer)

**Rationale:**
- Client-side crawling (browser automation) requires spinning up a headless browser per request = expensive ($$$), slow
- Server-side fetch is lightweight, fast, and handles 95% of websites fine
- For JavaScript-heavy SPAs that require rendering: we accept the limitation for Phase 1 ("some JS content not captured")
- Trade-off: We lose dynamic content, but gain speed and cost efficiency

**Alternative considered:** Playwright for JS-heavy sites. Cost prohibitive at scale.

---

### 2. Crawler Rate Limiting & Crawl Depth

**Decision:** Max 100 pages per crawl, max 30 second timeout, 3 concurrent requests

**Rationale:**
- 100 pages captures >95% of business websites (typical small/mid-market business has 10-50 pages)
- 30s timeout prevents server resource exhaustion; matches user expectation ("scanning" spinner shouldn't spin >30s)
- 3 concurrent requests per crawl = balances speed vs. load on target server (don't DDoS user's site)
- Users get immediate feedback ("first 100 pages scanned") rather than incomplete results hidden

---

### 3. Audit Rule Accuracy Strategy

**Decision:** Start with 5-7 high-confidence rules; document limitations upfront; add more post-launch

**Rationale:**
- 5-7 rules are rules we're *confident* predict AI visibility (schema types, meta descriptions, freshness signals)
- Shipping a shallow but accurate audit is better than a comprehensive but questionable audit
- User trust = higher lifetime value than feature breadth
- Post-launch, we track: which rules correlate with improved AI mentions? Which rules are noise? Iterate.
- Rules we're uncertain about (readability level, tone analysis, etc.) → save for Phase 2

**Rules in Phase 1:**
1. FAQ schema (high impact for answer capsules)
2. Organization schema (identity signals)
3. Meta description length (snippet display)
4. Content freshness (recency signals)
5. H1 presence/structure (content hierarchy)
6. Duplicate title tags (unique positioning)
7. (Maybe) Citation link coverage (source authority)

---

### 4. Caching & Refresh Strategy

**Decision:** 24-hour cache with manual refresh button

**Rationale:**
- Users audit once, make changes, re-audit in a few hours → 24h cache hits 90% of cases
- 24h prevents runaway crawl costs (unlimited re-scans = unlimited costs)
- Manual refresh button empowers users who genuinely changed their site and want immediate feedback
- If user doesn't see cache, they'll assume every click triggers a new crawl = higher cost perception even if false

**Alternative considered:** 7-day cache (cheaper, but users get frustrated). 2-hour cache (more accurate, but expensive).

---

### 5. Preview Method: Iframe vs. Screenshot

**Decision:** Iframe with CSP sandbox (Phase 1); screenshot fallback (Phase 2)

**Rationale:**
- Iframe is instant, no infrastructure cost, works for 95% of sites
- CSP sandbox prevents the embedded site from breaking out, stealing cookies, tracking user
- Some sites block embedding in iframes (X-Frame-Options) → preview fails gracefully with message
- Screenshot (Playwright) adds cost & latency; defer to Phase 2 if iframe feedback is negative

---

## Research: What Predicts AI Visibility?

### Signals We Know Help (high confidence)

1. **Structured data (schema markup)**
   - FAQ schema → improves answer capsule eligibility
   - Organization schema → improves entity recognition
   - Product/Review schema → improves e-commerce recommendations

2. **Content recency**
   - Pages updated in last 3 months rank higher (training data is recent)
   - Stale pages (>1 year old) deprioritized

3. **Unique, authoritative content**
   - Content copied from 10 other sources → low signal
   - Original, expert-written content → high signal

4. **Citation/source links**
   - AI models trust certain sources (Yelp, TripAdvisor, Better Business Bureau)
   - Being listed there correlates with higher AI mentions

### Signals We're Uncertain About (phase 2+)

- Readability level (Flesch-Kincaid, etc.)
- Tone/sentiment of content
- Page load speed
- Mobile responsiveness
- Social media integration
- Video/image content richness

### Sources

- Surven's own data: Which audited businesses saw improved AI visibility? Correlate with audit findings.
- OpenAI/Anthropic docs: Publicly available RAG best practices
- Industry research: SEO/AI visibility case studies

---

## Competitive Landscape

Similar tools:
- **Surfer SEO** — Detailed on-page SEO audit, but focuses on Google Search, not AI models
- **SE Ranking** — Website audit, but not AI-specific
- **Copy.ai** — Content optimization, but not website audit
- **ChatGPT's own "Analyze" feature** — Limited to URL snapshot, no recommendations

**Surven's differentiation:**
- AI-specific (not SEO generic)
- Actionable recommendations ("add FAQ schema" not just "schema missing")
- Tied to actual AI mention tracking (we can measure impact post-implementation)
- Multi-model awareness (tells you what ChatGPT cares about vs. Claude vs. Gemini)

---

## Cost Analysis

**Crawl costs (Phase 1):**
- Bandwidth: ~1MB per crawl average (100 pages × 10KB) = negligible
- Compute: <1s per crawl on modern server
- Storage: ~1MB per crawl result (findings + page metadata) → assume 1GB/month for 1000 users
- **Estimated:** $0.05-0.20 per crawl in infrastructure

**Scale scenario (break-even analysis):**
- 1000 users, 2 scans/user/month = 2000 crawls/month
- 2000 × $0.15 = $300/month in infrastructure
- If paid plan is $29/month, need 11+ paying users to break even
- Assume 5-10% conversion → feasible at scale

---

## Future Enhancements (Post-Launch)

1. **Automated rules updates**
   - Track which audit items correlate with improved mentions
   - Auto-adjust rule weights based on real-world impact

2. **Competitive benchmarking**
   - "Your FAQ schema is better than 70% of competitors in your industry"

3. **Fix recommendations with code snippets**
   - "How to add FAQ schema" tutorial tailored to site's tech stack (WordPress, Shopify, custom)

4. **Scheduled audits**
   - Automatic weekly/monthly scans with change notifications

5. **Multi-language audits**
   - Detect non-English content; localize recommendations

6. **Third-party tool integration**
   - Webhook to Zapier, Make, etc. ("If audit finds critical issue, send Slack message")

---

## Known Limitations & Disclaimers

**To include in UI:**

1. **Crawling limitations**
   - "We scan up to 100 pages. If your site has more, we prioritize homepage and top-linked pages."

2. **JavaScript content**
   - "Some dynamic content loaded by JavaScript may not be captured. For best results, ensure key info is in HTML."

3. **Rule accuracy**
   - "Our audit rules are based on industry research and our data analysis. They're not guarantees—implement recommendations gradually and measure results."

4. **Compliance scope**
   - "This audit focuses on AI visibility. It doesn't audit for SEO, accessibility, or security compliance."

---

## Metrics to Track Post-Launch

1. **Adoption**: % of users who run ≥1 audit per week
2. **Impact**: Do businesses that act on audit recommendations see improved AI mentions?
3. **Cost**: Average cost per audit vs. willingness to pay
4. **Accuracy**: Manual spot-check findings against reality (once/month)
5. **Support burden**: # of "why is X in the audit?" support tickets

**Success bar:** >50% of audit users report "audit recommendations were accurate and useful" in feedback.

---

## Technical Debt & Known Issues

- **HTML parsing is naive** (using regex for meta tags). Switch to htmlparser2 before Phase 2.
- **Link extraction not implemented** (placeholder function). Implement URL resolution + deduplication.
- **No retry logic** for failed crawls (just silently skip). Add exponential backoff.
- **Analysis happens in request path** (blocks response). Move to async job queue (Bull, RabbitMQ) if latency becomes issue.

---

## Timeline & Milestones

| Milestone | ETA | Description |
|-----------|-----|-------------|
| API endpoint & crawler | Week 1 | Core crawling + analysis engine |
| UI components | Week 2 | AuditPage, WebsitePreview, AuditFindings |
| Rules engine | Week 2 | Implement 5-7 audit rules |
| Testing & QA | Week 3 | Load test, security test, accuracy validation |
| Beta launch | Week 4 | Limited rollout to 10 power users |
| Public launch | Week 5 | Full rollout + marketing |

---

## Questions for Jake

1. **Which audit rules are highest priority for Surven's clients?**
   - Start with these; add others later
   - Example: "FAQ schema is most important for plumbers/dentists (Q&A-heavy industries)"

2. **How accurate should the audit be to ship?**
   - Current bar: 80% accuracy on 5 test sites
   - Is this good enough, or need 95%+?

3. **Cost sensitivity?**
   - If crawl cost is $0.20/scan, and conversion is 10% to $29/mo plan, margin is thin
   - Do we need to optimize further (cached crawls, lighter analysis) or okay with thin margin?

4. **Competitive positioning?**
   - What makes Surven's audit better than "run ChatGPT's site analyzer yourself"?
   - Is it the recommendations, the multi-model view, or the tracking over time?

---

**Document Owner:** Claude  
**Last Updated:** 2026-04-27  
**Review Cycle:** Before starting implementation, after first 100 users
