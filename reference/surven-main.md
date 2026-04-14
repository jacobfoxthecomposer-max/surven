# Surven — AI Search Visibility & Ranking Tool

## Overview
Surven is an n8n-based automation tool that audits client websites and automatically optimizes them for **GEO (Generative Engine Optimization)** — making pages more likely to be cited by ChatGPT, Perplexity, Google AI Overviews, and other AI search engines.

## Current Status
**Phase:** Building (MVP development, not yet on public website)
**Timeline:** Post-launch, plan to add to website/services eventually
**Primary Component:** Answer Capsule automation

## How It Works

**Complete n8n Workflow (with Approval & Backups):**

1. **Scrape** — n8n scrapes client website, extracts all pages & sections
2. **Audit** — n8n audits for GEO gaps (vague language, missing capsules, thin sections, etc.)
3. **AI Rewrites** — n8n calls Claude API to generate optimized content
4. **Backup (Automatic)** — n8n creates full snapshot of current website:
   - CMS native backup (WordPress/Webflow version history)
   - n8n backup stored in Supabase (timestamp + client name)
5. **Your Review** — You review Claude's suggestions in n8n, approve/reject changes
6. **Deploy** — Upon approval, n8n pushes updates to client CMS (WordPress, Webflow, etc.)
7. **Report** — Send client before/after comparison + rollback option
8. **Rollback (if needed)** — Client clicks "Revert" → n8n restores from backup

## Key Features
- [[surven-answer-capsules|Answer Capsule Automation]] — Core feature, generates 40–60 word answer blocks for AI extraction
- [[surven-n8n-workflow|n8n Workflow Blueprint]] — Full node-by-node build guide
- Audit checklist (schema, freshness signals, vague language detection)
- CMS integration for direct deployment
- AI crawler compliance (robots.txt, ClaudeBot, GPTBot, PerplexityBot)

## Technology Stack
- **Orchestration:** n8n (workflow automation)
- **Clients:** React/Next.js (frontend)
- **Backend:** Supabase (data)
- **Deployment:** Vercel

## Business Goal
Help businesses rank higher and gain visibility in AI-powered search results by ensuring their content is properly structured and extracted by AI engines.

## n8n Workflow Breakdown

### Phase 1: Scrape & Audit (Automated)
```
Trigger: Manual or Scheduled
├─ Scrape client website (HTML parser)
├─ Extract all H2/H3 sections
└─ Store in n8n memory for next steps
```

### Phase 2: Audit & Analysis (Automated)
```
Check against GEO audit checklist:
├─ Missing answer capsules
├─ Vague language detection
├─ Thin sections (<100 words)
├─ Long sentences (>20 words)
├─ Stats without sources
├─ H2s not phrased as questions
├─ Missing FAQ schema
├─ No freshness signals
└─ AI crawler blocks (robots.txt)

Output: Detailed audit report (exportable)
```

### Phase 3: Claude AI Rewrites (Automated)
```
For each flagged section:
├─ Send to Claude API
├─ Claude generates answer capsule (40–60 words)
├─ Claude replaces vague language with metrics
├─ Claude adds sources to unsourced stats
└─ Return optimized content

Output: Before/After comparison (readable format)
```

### Phase 4: Backup (Automated)
```
Before any deployment:
├─ CMS Native Backup: Trigger WordPress/Webflow version history
├─ n8n Backup: Save to Supabase:
│  ├─ Client name
│  ├─ Timestamp
│  ├─ Full website HTML snapshot
│  └─ Original content of each updated section
└─ Ready for instant rollback if needed
```

### Phase 5: Your Review & Approval (MANUAL)
```
You receive notification with:
├─ Audit report
├─ All suggested changes (before/after)
├─ Estimated impact per section
└─ "APPROVE" or "REJECT" button in n8n

Decision gate stays with you — no surprises
```

### Phase 6: Deploy (Automated on Approval)
```
When you click APPROVE:
├─ n8n connects to client's CMS API
├─ Updates pages with approved changes
├─ Updates go live
└─ Sends confirmation to n8n dashboard
```

### Phase 7: Report & Rollback (You Control)
```
Send client:
├─ Summary of changes made
├─ Before/after screenshots
├─ Expected impact on AI visibility
├─ "REVERT CHANGES" button (if they want to rollback)
└─ Schedule for next scan

If rollback clicked:
├─ n8n restores from backup (CMS + Supabase)
├─ Website returns to pre-update state
└─ Complete audit trail saved
```

---

## Next Steps
- [ ] Finish Answer Capsule automation logic
- [ ] Build n8n workflows (scrape → audit → Claude → backup → deploy)
- [ ] Set up dual backup system (CMS native + Supabase)
- [ ] Test approval flow with internal/beta clients
- [ ] Build client-facing rollback UI
- [ ] Plan website integration & service offering
