# Optimizer: Client Tracking Methods by Business Model

## Quick Reference

| Business Model | Best Method | Why | Confidence |
|---|---|---|---|
| **Service** (plumber, contractor, dentist, lawyer, realtor, salon) | Custom phone number | Phone is primary lead source, easy to track calls | 🟢 High |
| **E-commerce** (online store, dropshipping) | UTM + Google Analytics | Digital sales flow, need conversion tracking | 🟢 High |
| **SaaS / Software** | UTM + Analytics + CRM | Multi-step sales, need funnel visibility | 🟢 High |
| **Local Restaurant** | Phone + UTM (hybrid) | Orders come via phone AND online | 🟡 Medium |
| **Local Retail** (boutique, bookstore) | Phone + foot traffic survey | Mix of calls and walk-ins | 🟡 Medium |
| **B2B Services** (consulting, agency) | UTM + Email tracking + CRM | Long sales cycle, need touchpoint visibility | 🟡 Medium |
| **Healthcare** (clinic, therapy) | Custom phone + form backup | Phone + appointment forms | 🟢 High |
| **Real Estate** (agent, brokerage) | Custom phone + CRM | Phone calls = showings/leads | 🟢 High |

---

## Detailed Breakdown

### 1. CUSTOM PHONE NUMBER
**Best for:** Service businesses, healthcare, real estate, restaurants (phone-heavy)

**How it works:**
- Google Voice, RingCentral, or call tracking service (CallTrackingMetrics, Invoca)
- List custom number on all 30 directories
- Track inbound calls + duration
- Client reports how many calls → booked jobs/revenue

**Implementation:**
```
1. Get custom phone number (Google Voice = free)
2. Set number on all directories after Tracker identifies them
3. Monitor call volume before/after
4. Client self-reports: "Call volume was X, now it's Y"
5. Client correlates calls → revenue (job booked, appointment made)
```

**Pros:**
- Easy setup, no client tech required
- Direct proof of AI visibility (calls are evidence)
- Works for phone-dominant businesses

**Cons:**
- Requires client trust on conversion reporting
- Can't independently verify "call → revenue"
- No demographic data on callers

---

### 2. UTM PARAMETERS + GOOGLE ANALYTICS
**Best for:** E-commerce, SaaS, web-heavy businesses, retail with online sales

**How it works:**
- Add `?utm_source=ai_visibility&utm_campaign=tracker` to links Tracker identifies
- Client implements tracking on website (Google Analytics 4)
- Track: sessions → conversions → revenue (if GA is set up)
- You see exact attribution in Google Analytics dashboard

**Implementation:**
```
1. Identify which URLs Tracker mentions (from Tracker scans)
2. Add UTM parameters to those URLs in directories
3. Client sets up GA4 conversion tracking (purchase, form submit, etc.)
4. You monitor GA4: sessions → conversions → revenue
5. Compare before/after across 30-90 day period
```

**Pros:**
- Objective data (you control verification)
- See full funnel: traffic → leads → customers
- Can track customer value
- Industry standard

**Cons:**
- Requires client has GA setup + configured conversions
- Requires digital sales flow
- Setup takes 1-2 weeks
- Need GA4 event tracking configured

---

### 3. CUSTOM LANDING PAGE + FORM
**Best for:** Web-heavy businesses, B2B, consulting, anything with email capture

**How it works:**
- Create dedicated landing page: "Found us via AI search?"
- Drive Tracker-identified URLs to this landing page
- Form captures: name, email, interest
- You get objective list of leads, client reports conversions

**Implementation:**
```
1. Build simple landing page (or Webflow/Unbounce template)
2. Point directories to this landing page
3. Form submits to Google Sheets or email
4. Track: form submissions → client conversions
```

**Pros:**
- Objective lead count (you see every submission)
- Works even without GA setup
- Can ask qualification questions
- Email list for follow-up

**Cons:**
- Adds friction (requires form fill vs direct call)
- Requires web dev work (landing page)
- Lower conversion rate than direct contact

---

### 4. CLIENT SELF-REPORT (BACKUP ONLY)
**Best for:** Hybrid or complex businesses, or when other methods impossible

**How it works:**
- Monthly survey: "How many new customers came from AI visibility?"
- Client estimates based on conversation feedback ("they said they found us online")
- Least reliable but better than nothing

**Implementation:**
```
1. Send monthly email: "New customers this month from AI visibility?"
2. Client estimates from memory
3. Track responses in spreadsheet
```

**Pros:**
- Minimal setup
- Works for any business type

**Cons:**
- Unreliable (memory-based estimates)
- No objective verification
- Only use as last resort

---

## Decision Tree: What Should You Use?

**Start here:**

1. **Does the client get most leads by phone?**
   - Yes → **Custom phone number** ✅
   - No → Go to step 2

2. **Does the client have online sales/conversion tracking?**
   - Yes (or willing to set up GA4) → **UTM + Analytics** ✅
   - No → Go to step 3

3. **Is adding a landing page feasible?**
   - Yes → **Landing page + form** ✅
   - No → **Self-report** (backup only) ⚠️

---

## For Your First Test Client

**Recommended approach for service business:**
1. **Primary:** Custom phone number (Google Voice)
2. **Backup:** Client self-report if they want ("Did calls convert?")
3. **Bonus:** If they have GA, add UTM parameters too for extra data

**Timeline:**
- Week 1: Set up Google Voice number, update directories
- Weeks 2-8: Monitor call volume, client tracks conversions
- Week 9: Rescan with Tracker, measure results

---

*Last updated: 2026-04-17*
