# Surven n8n Workflow v3 — Clean Build

**Parent:** [[surven-main|Surven Main Tool]]
**n8n Version:** 2.15.1 (cloud)
**Date:** 2026-04-10

---

## Architecture

```
Manual Trigger
  → Set Client Details (you configure this)
  → Parse Pages (Code)
  → Scrape Pages (HTTP Request — one per page, automatic)
  → Parse & Audit All Pages (Code)
  → IF has flagged sections
    → Prepare Claude Prompt (Code)
    → Call Claude API (HTTP Request)
    → Parse Response + Build CSV (Code)
    → Backup to Supabase (HTTP Request)
    → Send CSV to Discord (HTTP Request — file attachment)
```

**11 nodes. No loops. Linear flow.**

---

## Step 0: Supabase — Run This SQL First

Go to **Supabase → SQL Editor** and run:

```sql
-- Fresh table for v3 workflow
DROP TABLE IF EXISTS website_backups;

CREATE TABLE website_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  cms_type TEXT NOT NULL,
  pages JSONB NOT NULL,
  audit_data JSONB NOT NULL,
  rewrite_data JSONB,
  status TEXT DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backups_client ON website_backups(client_name);
CREATE INDEX idx_backups_status ON website_backups(status);
CREATE INDEX idx_backups_created ON website_backups(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_backups_updated
  BEFORE UPDATE ON website_backups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Node-by-Node Build Guide

---

### Node 1: Manual Trigger

| Setting | Value |
|---------|-------|
| **Type** | Manual Trigger |

Just drag it onto the canvas. No configuration needed.

---

### Node 2: Set Client Details

| Setting | Value |
|---------|-------|
| **Type** | Set |
| **Mode** | Manual Mapping |
| **Keep Only Set** | ON |

**Add these fields (click "Add Field" for each):**

| Field Name | Type | Value (change these for each client) |
|-----------|------|------|
| `client_name` | String | `Joes Plumbing` |
| `client_url` | String | `https://joesplumbing.com` |
| `cms_type` | String | `wordpress` |
| `page_1` | String | `https://joesplumbing.com` |
| `page_2` | String | `https://joesplumbing.com/services` |
| `page_3` | String | `https://joesplumbing.com/about` |

> **To add more pages:** Add `page_4`, `page_5`, etc. The next node picks up all fields starting with `page_`.
> **To use fewer pages:** Delete the field or leave it blank. Blank pages are ignored.

---

### Node 3: Parse Pages

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Language** | JavaScript |
| **Mode** | Run Once for All Items |

**Code:**

```javascript
const input = $input.first().json;

// Collect all page_N fields
const pages = [];
for (const [key, value] of Object.entries(input)) {
  if (key.startsWith('page_') && value && value.trim() !== '') {
    pages.push(value.trim());
  }
}

if (pages.length === 0) {
  throw new Error('No pages configured. Add at least one page_1, page_2, etc. in Set Client Details.');
}

// Return one item per page — HTTP Request will process each automatically
return pages.map(url => ({
  json: {
    client_name: input.client_name,
    client_url: input.client_url,
    cms_type: input.cms_type,
    page_url: url
  }
}));
```

---

### Node 4: Scrape Pages

| Setting | Value |
|---------|-------|
| **Type** | HTTP Request |
| **Method** | GET |
| **URL** | `={{ $json.page_url }}` |
| **Authentication** | None |
| **Options → Response Format** | Text |
| **Options → Full Response** | OFF |
| **Options → Timeout** | `30000` |
| **Batching → Items per Batch** | `1` (so we don't hammer the server) |

> **Add this header** (prevents some sites from blocking):
> | Header Name | Header Value |
> |-------------|-------------|
> | `User-Agent` | `Mozilla/5.0 (compatible; SurvenBot/1.0)` |

This node receives multiple items (one per page) and makes one GET request per item. Output goes into `$json.data` for each.

---

### Node 5: Parse & Audit All Pages

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Language** | JavaScript |
| **Mode** | Run Once for All Items |

**Code:**

```javascript
const scrapedItems = $input.all();
const pageInputs = $('Parse Pages').all();

// ── Parse HTML into H2/H3 sections ──
function parseSections(html) {
  const sections = [];
  // Match H2 or H3 and capture everything until the next heading or end
  const regex = /<(h[23])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h[1-6]|<\/body|$)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const heading = match[2].replace(/<[^>]*>/g, '').trim();
    const content = match[3].replace(/<[^>]*>/g, '').trim();
    if (!heading || heading.length < 3) continue; // skip empty/tiny headings
    sections.push({
      heading_tag: match[1].toUpperCase(),
      heading_text: heading,
      content: content,
      word_count: content.split(/\s+/).filter(Boolean).length
    });
  }
  return sections;
}

// ── Audit a single section against GEO checklist ──
function auditSection(section) {
  const issues = [];
  const content = section.content.toLowerCase();

  // 1. Missing answer capsule (first paragraph not 40-60 words)
  const firstPara = section.content.split(/\n/)[0] || '';
  const fpWordCount = firstPara.split(/\s+/).filter(Boolean).length;
  if (fpWordCount < 40 || fpWordCount > 60) {
    issues.push('Missing answer capsule');
  }

  // 2. Thin section (under 100 words total)
  if (section.word_count < 100) {
    issues.push('Thin section (under 100 words)');
  }

  // 3. Long sentences (over 20 words)
  const sentences = section.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const longCount = sentences.filter(s => s.split(/\s+/).filter(Boolean).length > 20).length;
  if (longCount > 0) {
    issues.push(`${longCount} long sentence(s) over 20 words`);
  }

  // 4. Vague language
  const vagueTerms = [
    'many', 'some', 'widely', 'significantly', 'best',
    'top-rated', 'industry-leading', 'game-changing', 'revolutionary',
    'it is known', 'experts believe', 'best-in-class', 'widely used',
    'some studies suggest', 'many experts'
  ];
  const foundVague = vagueTerms.filter(term => content.includes(term));
  if (foundVague.length > 0) {
    issues.push(`Vague language: ${foundVague.join(', ')}`);
  }

  // 5. Heading not phrased as question
  const h = section.heading_text.toLowerCase();
  const isQuestion = h.includes('?') ||
    /^(who|what|when|where|why|how|is|are|do|does|can|should|will)\b/.test(h);
  if (!isQuestion) {
    issues.push('Heading not a question');
  }

  // 6. Stats without source
  const hasStats = /\d+%|\$[\d,]+|\d+\s*(hours|days|years|minutes|months|weeks)/.test(section.content);
  const hasSource = /according to|source:|cited|citation|\(\d{4}\)|study|report by/i.test(section.content);
  if (hasStats && !hasSource) {
    issues.push('Stats without source citation');
  }

  return issues;
}

// ── Process all pages ──
const allFlagged = [];
const pageSummaries = [];

for (let i = 0; i < scrapedItems.length; i++) {
  const html = scrapedItems[i].json.data || '';
  const pageUrl = pageInputs[i].json.page_url;

  const sections = parseSections(html);
  const flagged = sections
    .map((s, idx) => ({
      ...s,
      section_index: idx,
      page_url: pageUrl,
      issues: auditSection(s)
    }))
    .filter(s => s.issues.length > 0);

  pageSummaries.push({
    page_url: pageUrl,
    total_sections: sections.length,
    flagged_count: flagged.length
  });

  allFlagged.push(...flagged);
}

const clientName = pageInputs[0].json.client_name;
const cmsType = pageInputs[0].json.cms_type;

return [{
  json: {
    client_name: clientName,
    cms_type: cmsType,
    page_summaries: pageSummaries,
    total_flagged: allFlagged.length,
    flagged_sections: allFlagged
  }
}];
```

---

### Node 6: IF — Has Flagged Sections

| Setting | Value |
|---------|-------|
| **Type** | IF |
| **Condition** | Number |
| **Value 1** | `={{ $json.total_flagged }}` |
| **Operation** | is greater than |
| **Value 2** | `0` |

**True →** continues to Node 7 (Prepare Claude Prompt)
**False →** workflow ends (nothing to fix)

---

### Node 7: Prepare Claude Prompt

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Language** | JavaScript |
| **Mode** | Run Once for All Items |

**Code:**

```javascript
const input = $input.first().json;
const sections = input.flagged_sections;

// Build the sections block for the prompt
const sectionsText = sections.map((s, i) => {
  return `--- SECTION ${i + 1} ---
Page: ${s.page_url}
Heading Tag: ${s.heading_tag}
Current Heading: ${s.heading_text}
Current Content: ${s.content.substring(0, 500)}
Word Count: ${s.word_count}
Issues: ${s.issues.join('; ')}`;
}).join('\n\n');

const systemPrompt = `You are a GEO (Generative Engine Optimization) expert. You rewrite website content so AI search engines (ChatGPT, Perplexity, Google AI Overviews) extract and cite it.

You follow these rules with zero exceptions:

ANSWER CAPSULE RULES:
- Exactly 40-60 words. Count carefully before responding.
- Placed directly under the heading. No intro, no fluff, no preamble.
- Must make complete sense with ZERO surrounding context.
- Must contain at least ONE specific number, percentage, or named entity.
- Every sentence must be 15 words or fewer.
- NEVER use: "many," "some," "widely," "best," "industry-leading," "game-changing," "experts believe," "significantly," "top-rated," "revolutionary," "best-in-class"
- Replace every vague claim with a specific metric + source: "according to [Source] ([Year])"
- Tone: direct, factual, authoritative. Zero hedging. Zero marketing language.

HEADING RULES:
- Every heading must be phrased as a question (Who/What/When/Where/Why/How/Is/Are/Do/Does/Can/Should)
- Must end with "?"
- Must be specific to the topic, not generic

SUPPORTING CONTENT RULES:
- 150-300 words expanding on the answer capsule
- Include 2-3 bullet points or a comparison where relevant
- All claims must have sources with years
- Sentences max 15 words each`;

const userPrompt = `Rewrite each flagged section below. There are ${sections.length} sections total.

${sectionsText}

RESPOND WITH ONLY A JSON ARRAY. No explanation, no markdown fences, no text before or after. Just the raw JSON array.

Each element must be exactly this structure:
[
  {
    "section_index": 0,
    "page_url": "the page URL",
    "original_heading": "the original heading text",
    "rewritten_heading": "New Question Heading?",
    "answer_capsule": "Exactly 40-60 words of direct factual standalone answer with at least one specific number or named entity. Every sentence fifteen words max. No vague language anywhere.",
    "supporting_content": "150-300 words of supporting detail with sourced claims and specific metrics.",
    "capsule_word_count": 52
  }
]

Return exactly ${sections.length} objects in the array, one per section, in the same order.`;

// Build the Claude API request body
const requestBody = {
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [
    { role: 'user', content: systemPrompt + '\n\n' + userPrompt }
  ]
};

return [{
  json: {
    ...input,
    claude_request_body: requestBody
  }
}];
```

---

### Node 8: Call Claude API

| Setting | Value |
|---------|-------|
| **Type** | HTTP Request |
| **Method** | POST |
| **URL** | `https://api.anthropic.com/v1/messages` |
| **Authentication** | None (we set headers manually) |
| **Send Headers** | ON |
| **Send Body** | ON |
| **Body Content Type** | JSON |
| **Specify Body** | Using JSON |
| **JSON Body** | `={{ JSON.stringify($json.claude_request_body) }}` |

**Headers (add all 3):**

| Header Name | Header Value |
|-------------|-------------|
| `x-api-key` | `YOUR_CLAUDE_API_KEY` |
| `anthropic-version` | `2023-06-01` |
| `content-type` | `application/json` |

> **Replace** `YOUR_CLAUDE_API_KEY` with your actual key, or use an n8n expression referencing a credential.

---

### Node 9: Parse Response + Build CSV

| Setting | Value |
|---------|-------|
| **Type** | Code |
| **Language** | JavaScript |
| **Mode** | Run Once for All Items |

**Code:**

```javascript
const claudeOutput = $input.first().json;
const auditData = $('Parse & Audit All Pages').first().json;
const clientName = auditData.client_name;
const cmsType = auditData.cms_type;
const flaggedSections = auditData.flagged_sections;

// ── Extract Claude's response text ──
let responseText = '';
if (claudeOutput.content && Array.isArray(claudeOutput.content)) {
  responseText = claudeOutput.content[0].text;
} else if (typeof claudeOutput.content === 'string') {
  responseText = claudeOutput.content;
} else if (claudeOutput.data && claudeOutput.data.content) {
  responseText = claudeOutput.data.content[0].text;
}

// Strip markdown code fences if Claude wrapped the response
responseText = responseText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

// ── Parse JSON ──
let rewrites;
try {
  rewrites = JSON.parse(responseText);
  if (!Array.isArray(rewrites)) {
    rewrites = [rewrites]; // Handle single object
  }
} catch (e) {
  throw new Error('Failed to parse Claude response as JSON. Raw response: ' + responseText.substring(0, 500));
}

// ── Validate each capsule word count ──
const validated = rewrites.map(r => {
  const actualWords = r.answer_capsule.split(/\s+/).filter(Boolean).length;
  return {
    ...r,
    word_count_actual: actualWords,
    valid: actualWords >= 40 && actualWords <= 60
  };
});

// ── Build CSV ──
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(values) {
  return values.map(escapeCsv).join(',');
}

const headers = [
  'Page URL',
  'Section #',
  'Tag',
  'Original Heading',
  'Suggested Heading',
  'Issues Found',
  'Original Content (Preview)',
  'New Answer Capsule',
  'New Supporting Content (Preview)',
  'Capsule Words',
  'Valid (40-60)?'
];

const rows = [csvRow(headers)];

for (let i = 0; i < validated.length; i++) {
  const rewrite = validated[i];
  // Match to original flagged section
  const original = flaggedSections[i] || {};

  rows.push(csvRow([
    rewrite.page_url || original.page_url || '',
    i + 1,
    original.heading_tag || '',
    rewrite.original_heading || original.heading_text || '',
    rewrite.rewritten_heading || '',
    (original.issues || []).join('; '),
    (original.content || '').substring(0, 300),
    rewrite.answer_capsule || '',
    (rewrite.supporting_content || '').substring(0, 300),
    rewrite.word_count_actual || '',
    rewrite.valid ? 'YES' : 'NO'
  ]));
}

const csvContent = rows.join('\n');

// ── Summary line for Discord message ──
const validCount = validated.filter(r => r.valid).length;
const totalCount = validated.length;
const pagesAudited = auditData.page_summaries.map(p => p.page_url).join(', ');

const discordMessage = [
  `**GEO Audit Report — ${clientName}**`,
  `Pages scanned: ${auditData.page_summaries.length}`,
  `Sections flagged: ${totalCount}`,
  `Valid capsules (40-60 words): ${validCount}/${totalCount}`,
  `Pages: ${pagesAudited}`,
  '',
  'See attached CSV for full before/after details.'
].join('\n');

// ── Supabase payload ──
const supabasePayload = {
  client_name: clientName,
  cms_type: cmsType,
  pages: auditData.page_summaries,
  audit_data: flaggedSections,
  rewrite_data: validated,
  status: 'pending_review'
};

// ── Create binary CSV file ──
const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
const timestamp = new Date().toISOString().split('T')[0];
const fileName = `geo-audit-${clientName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.csv`;

return [{
  json: {
    discord_message: discordMessage,
    supabase_payload: supabasePayload,
    file_name: fileName,
    valid_count: validCount,
    total_count: totalCount
  },
  binary: {
    csvFile: {
      data: csvBase64,
      mimeType: 'text/csv',
      fileName: fileName,
      fileExtension: 'csv'
    }
  }
}];
```

---

### Node 10: Backup to Supabase

| Setting | Value |
|---------|-------|
| **Type** | HTTP Request |
| **Method** | POST |
| **URL** | `https://qmffhusxyzqscrdbjqsh.supabase.co/rest/v1/website_backups` |
| **Authentication** | None (headers below) |
| **Send Headers** | ON |
| **Send Body** | ON |
| **Body Content Type** | JSON |
| **Specify Body** | Using JSON |
| **JSON Body** | `={{ JSON.stringify($json.supabase_payload) }}` |

**Headers (add all 4):**

| Header Name | Header Value |
|-------------|-------------|
| `apikey` | `YOUR_SUPABASE_SERVICE_ROLE_KEY` |
| `Authorization` | `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY` |
| `Content-Type` | `application/json` |
| `Prefer` | `return=representation` |

> **Replace** `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your actual key.

---

### Node 11: Send CSV to Discord

| Setting | Value |
|---------|-------|
| **Type** | HTTP Request |
| **Method** | POST |
| **URL** | `YOUR_DISCORD_WEBHOOK_URL` |
| **Authentication** | None |
| **Send Headers** | OFF |
| **Send Body** | ON |
| **Body Content Type** | Form-Data Multipart |

**Body Parameters (add exactly 2):**

| Parameter # | Name | Parameter Type | Value |
|-------------|------|---------------|-------|
| 1 | `payload_json` | String | `={{ JSON.stringify({ content: $json.discord_message }) }}` |
| 2 | `files[0]` | n8n Binary File | Input Data Field Name: `csvFile` |

> **How to set parameter 2:**
> 1. Click "Add Parameter"
> 2. Set Name to `files[0]`
> 3. Change the Parameter Type dropdown to **n8n Binary File**
> 4. In the "Input Data Field Name" field, type `csvFile`

> **Replace** `YOUR_DISCORD_WEBHOOK_URL` with your actual Discord webhook URL.

---

## Connection Map

Wire the nodes in this exact order:

```
[Manual Trigger] → [Set Client Details] → [Parse Pages] → [Scrape Pages]
→ [Parse & Audit All Pages] → [IF Has Flagged] 
  → TRUE: [Prepare Claude Prompt] → [Call Claude API] 
    → [Parse Response + Build CSV] → [Backup to Supabase] → [Send CSV to Discord]
  → FALSE: (nothing — workflow ends)
```

---

## Testing Checklist

### Before first run:
- [ ] Supabase SQL script has been run (Step 0)
- [ ] All 3 API keys are entered in the correct nodes (Claude, Supabase, Discord)
- [ ] Client details are filled in Node 2 with real page URLs
- [ ] All nodes are wired in the correct order

### After running — check each node output:

| Node | What to verify |
|------|----------------|
| **Parse Pages** | Shows one item per page with `page_url` field |
| **Scrape Pages** | Each item has `data` field with HTML content |
| **Parse & Audit** | `total_flagged` > 0, `flagged_sections` array has entries with `issues` |
| **IF** | Routes to TRUE branch |
| **Prepare Claude Prompt** | `claude_request_body` has `messages` with all sections listed |
| **Call Claude** | Response has `content[0].text` with JSON array |
| **Parse + Build CSV** | Has `discord_message` text, binary `csvFile` exists |
| **Backup to Supabase** | Returns the inserted row with `id` field |
| **Send CSV to Discord** | Returns 200/204 — check Discord channel for message + CSV file |

### Common issues:
- **Scrape returns empty HTML:** Site may block bots. Try a different User-Agent or use a simpler test site first.
- **Parse finds 0 sections:** The site may use non-standard heading tags (`<div class="h2">` instead of `<h2>`). Check the raw HTML.
- **Claude returns non-JSON:** The parse node strips code fences, but if Claude adds explanation text, it will fail. Re-run — it's usually consistent.
- **Discord file doesn't attach:** Make sure parameter 2 type is set to "n8n Binary File" (not String).

---

## What This Workflow Does NOT Do (Yet)

These are intentionally left out for v3. Add after the core flow is proven:

- ❌ Approval flow (Discord buttons → webhook → deploy)
- ❌ CMS deployment (WordPress/Webflow/Shopify push)
- ❌ Rollback system
- ❌ FAQ schema injection
- ❌ Retry on invalid word count
- ❌ AI crawler robots.txt check
- ❌ Freshness signal injection

---

## CSV Output Example

When opened in Excel/Sheets, the CSV looks like:

| Page URL | Section # | Tag | Original Heading | Suggested Heading | Issues Found | Original Content (Preview) | New Answer Capsule | New Supporting Content (Preview) | Capsule Words | Valid? |
|----------|-----------|-----|-----------------|-------------------|-------------|---------------------------|-------------------|-------------------------------|--------------|--------|
| joesplumbing.com | 1 | H2 | Why Choose Us | What Makes Joe's Plumbing Different From Other Phoenix Plumbers? | Vague language: best; Heading not a question | Welcome to Joe's Plumbing! We've been the best... | Joe's Plumbing completes 2,400+ residential jobs annually across Maricopa County. Licensed (ROC #289541) and insured... | Serving Phoenix since 2003, Joe's Plumbing maintains a 4.9-star rating... | 48 | YES |
