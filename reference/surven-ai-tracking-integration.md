# Surven AI Tracking Integration Plan
## Full Otterly-Competing Feature Implementation (2026-04-09)

---

## Overview

Build out the remaining AI tracking features to fully compete with Otterly.ai. This document outlines the exact features, database schema, API routes, UI components, and implementation strategy.

---

## Remaining Features to Build

### 1. AI Prompt Research Tool
**What:** Let clients input custom search prompts to monitor, in addition to auto-generated ones.

**Current State:** `search_prompts` table exists; custom prompts can be added via `PromptsTab.tsx`

**What's Missing:**
- Currently only shows custom prompts added by user
- Need to surface **what prompts real users are searching** (market research)
- This requires analyzing public search data or using third-party APIs

**Implementation:**
- For MVP: Keep current custom prompt system
- Future: Integrate with keyword research tools (SEMrush, Ahrefs API) or prompt analytics service
- Allow clients to browse suggested prompts by industry/location

---

### 2. Brand Visibility Index (Proprietary Scoring)
**What:** Sophisticated 0–100 visibility score, not just raw scan results.

**Current State:** Simple visibility_score based on mention count

**What to Add:**
- Multi-factor scoring algorithm:
  - Mention frequency (40%)
  - Sentiment (positive mentions weighted higher) (30%)
  - Competitor positioning (how you rank vs competitors) (20%)
  - Trend (is visibility improving?) (10%)

**Database Addition:**
```sql
ALTER TABLE scans ADD COLUMN visibility_index INT DEFAULT 0; -- new 0-100 proprietary score
ALTER TABLE scans ADD COLUMN score_breakdown JSONB; -- store calculation breakdown
```

**Calculation Logic:**
```typescript
function calculateVisibilityIndex(scan: Scan): number {
  const mentionScore = (scan.mentions / scan.totalPrompts) * 40;
  const sentimentScore = (scan.avgSentiment / 5) * 30; // 0-5 scale
  const competitorScore = calculateCompetitorRank(scan) * 20;
  const trendScore = calculateTrend(scan.businessId) * 10;
  
  return Math.round(mentionScore + sentimentScore + competitorScore + trendScore);
}
```

---

### 3. Google Looker Studio Connector
**What:** Let clients create custom dashboards in Google Looker Studio using Surven data.

**How it works:**
1. Client authenticates with Google in Surven settings
2. Surven creates a BigQuery dataset with client's scan results
3. Client can build dashboards in Looker Studio pulling from that dataset

**Implementation:**
- Add Google OAuth scope: `https://www.googleapis.com/auth/bigquery`
- Create service account with BigQuery permissions
- On scan completion, write results to BigQuery table
- Client sets up Looker Studio data connector (Google-managed)

**Database Addition:**
```sql
CREATE TABLE looker_studio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  google_account_email TEXT,
  bigquery_dataset_id TEXT,
  connected_at TIMESTAMP DEFAULT now()
);
```

---

### 4. Client Customization Layer
**What:** Ability to add one-off tracking features per client without breaking the core product.

**Strategy:**
- Flexible database schema (use JSONB columns)
- Per-client feature flags
- "Custom Requests" management system

**Database Additions:**
```sql
CREATE TABLE client_custom_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  feature_name TEXT NOT NULL, -- e.g., "industry_sentiment_split", "competitor_pricing_tracking"
  feature_config JSONB, -- flexible config per feature
  enabled BOOLEAN DEFAULT true,
  requested_date TIMESTAMP DEFAULT now(),
  implemented_date TIMESTAMP
);

CREATE TABLE feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, declined
  requested_date TIMESTAMP DEFAULT now()
);
```

**Implementation Example:**
When a client asks "Can you track our reviews on platforms A, B, C alongside AI mentions?" — add a custom feature request, build the feature, then flag it as available for all clients.

---

### 5. AI Prompt Research Tool (Enhanced)
**What:** Surface real AI search prompts people are using, not just client-created ones.

**Data Source Options:**
- **Option A (MVP):** Start with industry + location templates (e.g., "What's the best dentist in Hartford CT?")
- **Option B (Future):** Integrate with Perplexity / ChatGPT API to pull trending prompts
- **Option C (Future):** LLM-generated prompts based on industry + location + keywords

**Database Addition:**
```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  popularity INT DEFAULT 0, -- track how often this prompt is used across all clients
  created_at TIMESTAMP DEFAULT now()
);
```

**UI Change:**
- In `PromptsTab.tsx`, show "Suggested Prompts" carousel
- Clients can add templates to their monitoring list with one click
- Over time, learn which prompts convert to scans (product analytics)

---

### 6. Multi-Language / 40+ Country Support
**What:** Let businesses track AI visibility in different languages and countries.

**Implementation:**
- Add `country_code` and `language_code` columns to `search_prompts`
- Modify scan logic to query AI models in multiple languages
- Example: "What's the best plumber in [city], [country]?" in Spanish, Portuguese, French, etc.

**Database Addition:**
```sql
ALTER TABLE search_prompts ADD COLUMN country_code TEXT DEFAULT 'US'; -- ISO 3166-1 alpha-2
ALTER TABLE search_prompts ADD COLUMN language_code TEXT DEFAULT 'en'; -- ISO 639-1
```

**Cost:** Multi-language queries cost more API calls; factor into budget

---

## Implementation Priority & Phases

### Phase 10 (Immediate – Next Sprint)
- [ ] Implement proprietary Brand Visibility Index algorithm
- [ ] Add `visibility_index` + `score_breakdown` to scans table
- [ ] Update dashboard to show new index prominently
- [ ] Add feature request management system (database + UI)

### Phase 11 (Within 2 Weeks)
- [ ] Enhance AI Prompt Research Tool with template suggestions
- [ ] Add `prompt_templates` table + seed with 50+ industry/location combos
- [ ] Update `PromptsTab` to show suggested prompts carousel

### Phase 12 (Within 1 Month)
- [ ] Google Looker Studio connector setup
- [ ] BigQuery integration + sync pipeline
- [ ] Settings page section for Looker Studio auth

### Phase 13 (Ongoing)
- [ ] Client customization layer (custom feature implementation as requested)
- [ ] Multi-language support (if client demand warrants)

---

## New API Routes Needed

```typescript
// GET /api/tracking/visibility-index?businessId=xxx
// Returns: { visibility_index, score_breakdown, trend }

// POST /api/tracking/prompt-templates?industry=xxx&country=xxx
// Returns: [ { prompt_text, popularity }, ... ]

// POST /api/looker-studio/connect
// Initiates Google OAuth flow

// GET /api/looker-studio/status?businessId=xxx
// Returns: { connected, datasetId, lastSync }

// POST /api/feature-requests
// Create new feature request (client → admin)

// GET /api/feature-requests?businessId=xxx
// List requests for this client

// POST /api/custom-features
// Admin: implement custom feature for client
```

---

## New UI Components

1. **VisibilityIndexCard** — Show proprietary 0–100 score with breakdown tooltip
2. **PromptTemplateCarousel** — Suggested prompts by industry
3. **FeatureRequestForm** — Client-facing form to request custom features
4. **LookerStudioConnectButton** — OAuth button in Settings
5. **ScoreBreakdownChart** — Pie/donut showing contribution of each factor

---

## Database Schema Summary (All Changes)

```sql
-- Add to scans table
ALTER TABLE scans ADD COLUMN visibility_index INT DEFAULT 0;
ALTER TABLE scans ADD COLUMN score_breakdown JSONB;

-- Add to search_prompts table
ALTER TABLE search_prompts ADD COLUMN country_code TEXT DEFAULT 'US';
ALTER TABLE search_prompts ADD COLUMN language_code TEXT DEFAULT 'en';

-- New tables
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  country_code TEXT DEFAULT 'US',
  language_code TEXT DEFAULT 'en',
  prompt_text TEXT NOT NULL,
  popularity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, declined
  requested_date TIMESTAMP DEFAULT now()
);

CREATE TABLE client_custom_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  feature_name TEXT NOT NULL,
  feature_config JSONB,
  enabled BOOLEAN DEFAULT true,
  requested_date TIMESTAMP DEFAULT now(),
  implemented_date TIMESTAMP
);

CREATE TABLE looker_studio_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  google_account_email TEXT,
  bigquery_dataset_id TEXT,
  connected_at TIMESTAMP DEFAULT now()
);
```

---

## Service Layer Changes

Add to `src/services/trackingService.ts`:

```typescript
// Calculate proprietary visibility index
export async function calculateVisibilityIndex(scan: Scan): Promise<VisibilityIndex> {
  // Multi-factor scoring logic
}

// Get suggested prompts for industry
export async function getPromptTemplatesByIndustry(industry: string, country?: string): Promise<PromptTemplate[]> {
  // Return top 10 popular prompts
}

// Check if client has custom feature enabled
export async function isCustomFeatureEnabled(businessId: string, featureName: string): Promise<boolean> {
  // Check client_custom_features table
}
```

---

## Why This Approach Works

1. **Modular** — Each feature can be built independently
2. **Scalable** — Database JSONB columns support storing any custom feature config
3. **Non-breaking** — Add features without changing existing code
4. **Client-centric** — Reactive model: build what clients ask for
5. **Competitive** — Matches Otterly feature-for-feature, with custom capabilities they can't offer

---

## Success Criteria

- [ ] Visibility Index shows in dashboard and matches Otterly's 0–100 scale
- [ ] Clients can request custom features via form
- [ ] Prompt templates reduce time to setup new monitoring
- [ ] Looker Studio connector allows clients to build custom dashboards
- [ ] Competitive parity with Otterly's core feature set
- [ ] 2-4 day implementation timeline for Phase 10

---

## Notes

- **Real API keys required:** Once `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY` are set, mock engine is bypassed
- **Budget:** $500/month covers all features for ~20–30 clients
- **Client feedback loop:** Track which clients request which features; prioritize highest-impact ones
- **Competitive advantage:** Agency clients see Surven's custom features as "included in their package," deepening lock-in
