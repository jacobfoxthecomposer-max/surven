# Website Audit & Analysis Feature Audit

**Date:** 2026-04-27  
**Scope:** New Website Audit & Analysis tool for Surven Tracker — URL input, website preview, automated scan, findings display  
**Concern:** Reliability, security, accuracy, performance, and user expectation management

## Executive Summary

The Website Audit & Analysis feature is a major addition that **directly impacts Surven's core value prop** — telling users what's actually wrong with their website for AI visibility. Risks fall into three categories:

1. **Accuracy & Trust** — If audit results are wrong, misleading, or incomplete, users lose confidence in the entire product
2. **Technical Complexity** — Website crawling, preview rendering, and real-time analysis at scale are expensive and fragile
3. **User Expectations** — Users may expect the audit to be exhaustive or actionable, leading to disappointment

Building this without addressing these risks results in a feature that looks impressive but either delivers poor insights or crashes under load.

---

## System Overview

**Data Flow:**
1. User enters business website URL
2. System fetches & renders website preview (iframe or screenshot)
3. System crawls website (depth/scope TBD) to extract content, metadata, structure
4. System analyzes crawled data against "AI reach" rules (schema, freshness, content quality, answer capsule compatibility, etc.)
5. System displays findings in sidebar: grouped by severity, with fix time & impact % estimates
6. Results are cached (duration TBD) or regenerated on demand

**Key Assumptions:**
- Websites are publicly accessible and won't block/rate-limit scans
- Analysis rules are accurate predictors of AI visibility
- Crawl time is acceptable (<10s per site)
- User expects audit findings to be actionable (not just informational)

---

## Risks Identified

### Risk 1: Website Preview Security & Rendering Issues
**Current behavior:** Plan is to embed site in iframe or render screenshot — actual method not yet decided.

**Problem:**
- **Malicious content in iframe:** If embedding arbitrary URLs via iframe, you're exposed to XSS, malware, tracking, phishing. An attacker-controlled site can break out of frame, capture user data, or serve malware.
- **Screenshot rendering:** Headless browser (Puppeteer, Playwright) crawls user URLs. If not sandboxed properly, malicious site JavaScript can exfiltrate data, escape container, or consume resources.
- **CORS/CSP conflicts:** Many sites block embedding in iframes or don't serve CORS headers. Preview fails silently or partially loads, confusing users.
- **Third-party tracking:** Embedded site's trackers (GA, Facebook pixel, etc.) fire within Surven's app, polluting your analytics and creating privacy issues.

**Severity:** **Critical** — Directly exposes app & users to malicious input.

**Impact:**
- User visits attacker's site via Surven → malware/phishing lands in user's browser
- Attacker's embedded site collects user data (cookies, form inputs, IP) from Surven context
- Reputation damage if Surven becomes vector for attacks

**Example:** Attacker registers `shopify-clone-phishing.com`, creates fake checkout form. User enters Surven, audits the fake site. Fake site's iframe keylogger captures user's Surven password field as they're logging back in later.

**What to do:** Defined in implementation prompt (sandbox iframe, use server-side screenshot, CSP headers, etc.).

---

### Risk 2: Crawling External Sites — Rate Limits, Blocks, Timeouts
**Current behavior:** Plan is to crawl user's website to extract content, metadata, and structure. Implementation details TBD.

**Problem:**
- **Site blocking:** Many sites block automated crawlers (robots.txt, 403s, honeypots). Crawl fails silently or takes 30+ seconds per retry.
- **Rate limiting:** Your crawler hits rate limits (429, slowdowns). If you implement retry logic, you're now waiting minutes per site. Users see "scanning..." spinner forever.
- **Timeout handling:** Large sites (1000+ pages) take hours to crawl fully. You can't crawl everything — but user might not know you stopped at page 100.
- **Legal/ethical:** Crawling a competitor's site (user just trying to understand the space) = copyright/ToS violations. No disclaimer in UI.
- **Resource exhaustion:** Crawling large/complex sites at scale (many concurrent users) = expensive bandwidth, CPU, storage. Cost spirals without proper limits.

**Severity:** **High** — Feature becomes unreliable and expensive.

**Impact:**
- Crawl times spike → users give up or complain
- Scan results incomplete (only 50 pages crawled of 500) → audit recommendations miss issues
- Cost per scan scales badly; Surven loses money on high-volume users
- Legal risk if crawling competitor sites or violating ToS

**Example:** User audits a large e-commerce site (2000 product pages). Crawler times out after 2 minutes, having seen only 10% of the site. Audit says "schema markup looks good" but misses schema errors on 90% of pages. User sees inconsistent findings, loses trust.

**What to do:** Defined in implementation prompt (bounded crawl depth/page count, parallel crawling with timeout, caching, clear UX about scope).

---

### Risk 3: Audit Rules Accuracy — "What's Good for AI" is Subjective & Evolving
**Current behavior:** Plan is to analyze websites against rules for AI reach. Specific rules not yet defined.

**Problem:**
- **No ground truth:** There's no official spec for "what AI tools care about." You're inferring from patterns, but those patterns may be wrong or outdated.
- **Model differences:** ChatGPT, Claude, Gemini, Google AI use different training data, retrieval methods, and preferences. A rule that helps Claude visibility might not help ChatGPT.
- **False positives/negatives:** Missing schema markup doesn't automatically mean low AI visibility (could be ranked on content). Conversely, perfect schema doesn't guarantee mentions (if content isn't relevant).
- **Scope creep:** What audit items do you check? Schema types, meta descriptions, content freshness, readability level, answer capsule formatting, citation links, business facts, etc. Defining all of these takes weeks. Partial coverage looks incomplete.
- **User misinterprets findings:** User sees "missing schema markup" → assumes adding it will fix their visibility. You add it → 2 weeks later, still no mentions → user blames Surven, not understanding that schema is one of many signals.

**Severity:** **High** — Core value prop credibility.

**Impact:**
- Users make changes based on faulty audit → no improvement → lose trust in Surven
- Audit is incomplete vs. user expectations → feature is seen as shallow, not worth using
- Competitive vulnerability: if competitor's audit is more comprehensive or more accurate, users switch

**Example:** Audit flags "low content freshness" (last updated 3 months ago) as a critical issue. User updates content. AI models still don't mention them (because the real issue is a missing citation source). User implements recommendations, sees no change, writes bad review: "Surven's audit doesn't work."

**What to do:** Defined in implementation prompt (start with high-confidence rules only, document limitations, add "why this matters" explanations, track audit accuracy over time).

---

### Risk 4: Caching & Data Staleness — Audit Results Mislead Users
**Current behavior:** Unclear if results are cached and for how long.

**Problem:**
- **Long cache TTL (1-7 days):** User audits site, gets results. User makes changes. User waits for cache to expire to see if changes helped. Meanwhile, user is working with stale data. Or user re-scans, pays infrastructure cost again.
- **No cache (every scan is fresh):** Crawling same site multiple times = expensive. If user audits 3 times in an hour, cost = 3x crawl cost. Users might abuse this intentionally or accidentally (refresh button, retry after network hiccup).
- **Cache invalidation:** User says "I updated my site, re-scan." How do you know the site actually changed? If you re-scan everything on demand, cost spikes. If you trust user, you might serve stale data if user didn't actually update.

**Severity:** **Medium** — Affects UX and cost, not core accuracy (though indirectly).

**Impact:**
- Users see outdated audit results → act on stale information
- Re-scan feature creates runaway crawling costs if users abuse it
- No clear guidance on "when should I re-scan?" leads to user confusion

**Example:** User audits site on Monday, sees issues, fixes them on Wednesday. Scan result is cached until Thursday. User checks Surven on Wednesday evening, still sees old findings, thinks fixes didn't work. User stress increases unnecessarily.

**What to do:** Defined in implementation prompt (smart cache with manual refresh, cost/benefit tracking, clear UX around "last scanned" date).

---

### Risk 5: Performance & Scalability — Slow Crawl + Analysis Blocks UI
**Current behavior:** Unclear if crawling/analysis happens sync or async, on client or server.

**Problem:**
- **Synchronous crawling:** If you crawl on the main backend request, large sites timeout. User sees loading spinner forever.
- **Async but no feedback:** You kick off crawl in background, return immediately, but don't notify user when done. User navigates away, comes back later confused about whether scan finished.
- **Concurrent scans:** Multiple users scanning large sites simultaneously = server CPU/memory spikes. One popular site could trigger a cascade of resource exhaustion.
- **No parallelization strategy:** Crawling site page-by-page serially is slow. Parallel crawling requires careful rate limit management (don't DDoS the user's site).
- **Analysis bottleneck:** Crawl finishes in 5s, but analysis takes 20s. Users expect results immediately.

**Severity:** **High** — Feature is unusable if slow.

**Impact:**
- Scans timeout frequently → users retry → more resource consumption
- Async scan without UX feedback → users think scan failed
- Concurrent crawls trigger cascading failures during peak usage

**Example:** Marketing team for large client has 5 people in Surven. All 5 click "Audit" on the same site simultaneously. Server attempts 5 concurrent crawls (each 500 pages). Server hits memory limit, crashes. All 5 users see "Error: Service Unavailable." Client loses faith in Surven.

**What to do:** Defined in implementation prompt (async/background jobs with WebSocket or polling feedback, queue-based crawling with backpressure, caching, parallelization within rate limits).

---

### Risk 6: Unclear Scope & User Expectation Mismatch
**Current behavior:** No explicit scope definition in feature brief.

**Problem:**
- **What's included in audit?** Only homepage? All pages? Only first 100 pages? Rules are unclear.
- **What about SPAs and JavaScript-heavy sites?** Crawler might not execute JS, sees only shell HTML. Misses actual content.
- **What about staging/internal sites?** User might try to audit non-public URL. Crawler fails, but error message is unclear.
- **Actionability gap:** Audit says "missing OpenGraph meta tags" but doesn't say how to fix it or why it matters for *this* user's industry.

**Severity:** **Medium** — Confuses users, reduces feature's perceived value.

**Impact:**
- Users scan incomplete results, make incomplete changes
- Users confused about why site they know is good still shows "issues"
- Support tickets: "Why didn't the audit detect X?"

**Example:** User runs audit on home page only. Audit looks great, user thinks they're done. They don't know audit skipped the 50-page knowledge base where most of their SEO power is. Traffic doesn't improve.

**What to do:** Defined in implementation prompt (clear scope in UI: "Auditing homepage and top 20 linked pages," clear rules with "why this matters," scope limitations upfront).

---

## Scope Notes

**Out of scope (for Phase 1):**
- Automated fixes (e.g., auto-generate schema markup) — focus on detection only
- Integration with external SEO tools (Ahrefs, SEMrush) — crawl in-house
- Real-time monitoring (watching for changes over time) — single scan only
- Multi-language support for audit explanations
- Mobile-specific audits
- Competitive site analysis (only audit user's own site)

**Constraints:**
- Crawl time budget: max 30 seconds per site (abort if longer)
- Crawl depth budget: max 100 pages per site (warn user)
- Concurrent crawls: max 3 per user account (queue the rest)
- Results cache: 24 hours, with manual refresh option

---

## Files to Modify / Create

**New files:**
- `src/features/dashboard/pages/AuditPage.tsx` — Main audit UI (URL input, preview, findings panel)
- `src/components/organisms/WebsitePreview.tsx` — Sandboxed iframe wrapper
- `src/components/organisms/AuditFindings.tsx` — Findings list, severity grouping, expandable items
- `src/utils/auditRules.ts` — Rule definitions (schema, freshness, content, etc.)
- `src/api/audit/route.ts` — API endpoint for crawl + analysis (Next.js server route)
- `src/utils/crawler.ts` — Website crawler with timeout, rate limit, and depth limits
- `src/types/audit.ts` — TypeScript types for audit results, findings, rules

**Existing files to modify:**
- `src/app/layout.tsx` — Add CSP headers for iframe sandboxing
- `src/features/dashboard/layout.tsx` — Add route for audit page

---

## Implementation Checklist

**Phase 1: Core Structure**
- [ ] Define audit rules (start with 5-7 high-confidence rules)
- [ ] Implement crawler with depth/page/timeout limits
- [ ] Implement audit analysis engine (apply rules to crawled data)
- [ ] Build async job queue for crawling (background tasks, not blocking request)

**Phase 2: Security & Sandboxing**
- [ ] Implement sandboxed iframe with CSP
- [ ] Add server-side screenshot renderer (Playwright with sandbox)
- [ ] Configure rate limiting on audit endpoint

**Phase 3: UI & UX**
- [ ] Build audit page with URL input, status indicator, results display
- [ ] Add severity grouping, expandable findings, metadata (time to fix, impact %)
- [ ] Add cache TTL display ("Last scanned: 2 hours ago") and manual refresh button
- [ ] Add scope disclaimer upfront ("Scanning homepage + top 20 pages")

**Phase 4: Testing & Hardening**
- [ ] Test on slow sites, large sites, blocked sites
- [ ] Load test with concurrent users
- [ ] Test on malicious test domains (XSS vectors, malware indicators)
- [ ] Document audit rule accuracy and limitations

---

## Success Criteria (Before Launch)

1. ✅ Crawl times stay <30s for 95th percentile of sites
2. ✅ Zero XSS vulnerabilities in preview or results
3. ✅ Audit findings are >80% accurate on test sites (manually validated)
4. ✅ Users understand scope ("first 100 pages, homepage prioritized")
5. ✅ Scan cost per user is <$0.50 (reasonable infrastructure budget)
6. ✅ Zero support tickets asking "why is X not in the audit"
