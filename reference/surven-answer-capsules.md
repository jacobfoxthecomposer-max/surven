# Answer Capsules — Surven Feature Spec

**Parent:** [[surven-main|Surven Main Tool]]

## What Is an Answer Capsule?

An **answer capsule** is a self-contained, **40–60 word block of direct, factual text** placed immediately beneath an H2 or H3 heading. It's designed to be the exact chunk that AI engines extract and cite.

**Why it matters:** AI engines decompose pages into semantic chunks and extract the densest, most direct passage per section. That passage is what gets cited. Answer capsules ensure *you* define what gets extracted.

---

## Answer Capsule Rules

### Format & Structure
- **Length:** Exactly 40–60 words
- **Placement:** Directly under H2 or H3 heading
- **Standalone:** Must make complete sense with zero surrounding context
- **Required element:** At least one specific number, percentage, or named entity
- **Sentence length:** Every sentence ≤15 words
- **Tone:** Direct, factual, no hedging, no marketing language

### Template
```
H2: [Question-phrased heading with "?"]
→ [40–60 word answer capsule]

[150–300 words of supporting detail/explanation]
```

### Example: Bad → Good

**❌ Bad:**
```
## Why Choose Our Plumbing Service?
Welcome to Joe's Plumbing! We've been serving Phoenix for 20 years and 
offer a wide range of services that meet all your plumbing needs.
```

**✅ Good:**
```
## What Emergency Plumbing Services Are Available in Phoenix?
Emergency plumbers in Phoenix available 24/7 for burst pipes, water heater 
failures, and drain blockages. Licensed and insured. Same-day service standard, 
average response time under 2 hours across Maricopa County.

[Supporting detail: 150-300 words about warranty, pricing, service areas...]
```

---

## Audit Checklist — What to Flag Per Page

| Issue | Detection Rule | Fix |
|-------|---------------|-----|
| **Missing answer capsule** | No 40–60 word direct answer in first paragraph under H2/H3 | Generate capsule per formula |
| **Thin section** | H2/H3 section under 100 words total | Expand to 120–180 words + add bullets/table |
| **Long sentence** | Any sentence over 20 words | Break into 2–3 sentences ≤15 words each |
| **Vague language** | "many," "some," "widely," "best," "industry-leading," "game-changing," "it is known," "experts believe," "significantly improves" | Replace with specific metric, named source, or benchmark |
| **Stat without source** | Any percentage, number, data claim with no citation in same sentence | Add: `according to [Source] ([Year])` |
| **No question headings** | H2s that don't contain "?" or start with Who/What/When/Where/Why/How | Rephrase as question |
| **Missing FAQ schema** | Page has Q&A content but no FAQPage JSON-LD in `<head>` | Generate & inject schema |
| **No freshness signal** | No visible "Last Updated" date | Add date footer/meta tag |
| **Blocked AI crawlers** | robots.txt blocks GPTBot, ClaudeBot, or PerplexityBot | Whitelist all AI crawlers |

---

## Rewrite Rules

### Answer Capsule Injection Formula
```
[Definite statement about H2 topic] + [specific stat or named entity] + 
[one clear outcome/fact]. [One supporting sentence ≤15 words.]
```
**Total:** 40–60 words. No hedging. No marketing.

**Example:**
- "Electric heat pumps cut heating costs by 40% annually (U.S. Dept. of Energy, 2024). Installation takes 1–2 days. Eligible for $8,000 federal tax credit through 2032."

### Language Replacement Cheat Sheet

| Kill This | Replace With |
|-----------|-------------|
| "industry-leading" | "#1 rated by [3rd-party] in [Year]" or specific metric |
| "significantly improves" | "increases [X] by [Y]% ([Source], [Year])" |
| "many experts believe" | "[Name], [Title] at [Company], states: '[quote]'" |
| "some studies suggest" | "[Study], [Year]: [specific finding]" |
| "best-in-class" | Named benchmark or 3rd-party ranking |
| "widely used" | "[X]% of [market segment] use it ([Source], [Year])" |
| Vague intro | Replace entirely with direct answer capsule |

### Stat Injection Formula
When a claim has no citation:
```
[Original claim], according to [Source] ([Year]).
```

**Example:**
- Before: "Water heater replacements take about a day."
- After: "Water heater replacements take 2–4 hours on average, according to the Plumbing-Heating-Cooling Contractors Association (2023)."

### Section Expansion Rule
If a section is under 100 words:
1. Keep or generate answer capsule (40–60 words)
2. Add 2–3 supporting bullet points OR comparison table
3. Target: **120–180 words total per section**

---

## Words That Maximize AI Citation

**High-citation capsule openers:**
- `"[Term] is [specific definition with entity]..."`
- `"[Entity] [verb] [specific outcome] by [metric] ([Source], [Year])."`
- `"[Process] takes [timeframe] and [specific result]."`
- `"The [specific version/standard] requires [exact rule]."`

**Examples:**
- "Cryptocurrency is a digital currency secured by cryptography, verified by a decentralized network called blockchain."
- "Python 3.12 improves performance by 2.5x over 3.11 (Guido van Rossum, Python Software Foundation, 2023)."
- "Root canal therapy takes 90 minutes and has a 95% success rate (American Endodontic Association, 2024)."

---

## n8n Workflow Approach (TBD)

**Stages:**
1. Scrape HTML
2. Parse into sections (H2/H3 structure)
3. Audit against checklist
4. Generate capsules for flagged sections (LLM call)
5. Validate word count & rules
6. Optionally inject into CMS
7. Report to client dashboard

