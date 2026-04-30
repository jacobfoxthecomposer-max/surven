# Surven Tracker — AI Model Swap: Perplexity → Gemini + Google AI Overview

**Task:** Replace Perplexity with two new models — Gemini (Google's conversational AI) and Google AI Overview (AI-generated summaries at the top of Google Search). The Tracker goes from 3 models to 4.

**Do NOT explore the codebase.** Every file path, line number, and exact code change is specified below. Read only the files listed, make only the changes listed.

---

## Model Naming Convention

| Old | New |
|-----|-----|
| `"perplexity"` | *(deleted)* |
| *(new)* | `"gemini"` |
| *(new)* | `"google_ai"` |

**UI labels:**
- `"gemini"` → display name: `"Gemini"`, short label: `"Gemini"`, color: `"#4285F4"`
- `"google_ai"` → display name: `"Google AI"`, short label: `"Goog"`, color: `"#34A853"`

---

## API Configuration Notes

**Gemini:** Uses Google AI Studio REST API. Key env var: `GOOGLE_GEMINI_API_KEY`.

**Google AI Overview:** Uses a SERP API service (e.g. SerpAPI) to extract the AI Overview block from Google Search results. Key env var: `GOOGLE_AI_OVERVIEW_API_KEY`. The endpoint and response parsing are isolated in a config block at the top of the function so they can be swapped in one place when the API service is decided. Do NOT hardcode assumptions — write it with a TODO comment marking where the endpoint/key go.

---

## FILE 1 — `src/types/database.ts`

**Only change:** Line 45.

```ts
// OLD
model_name: "chatgpt" | "claude" | "perplexity";

// NEW
model_name: "chatgpt" | "claude" | "gemini" | "google_ai";
```

No other changes to this file.

---

## FILE 2 — `src/utils/constants.ts`

**Only change:** Lines 54–58, the `AI_MODELS` array.

```ts
// OLD
export const AI_MODELS = [
  { id: "chatgpt", name: "ChatGPT", color: "#10a37f" },
  { id: "claude", name: "Claude", color: "#d97706" },
  { id: "perplexity", name: "Perplexity", color: "#22d3ee" },
] as const;

// NEW
export const AI_MODELS = [
  { id: "chatgpt", name: "ChatGPT", color: "#10a37f" },
  { id: "claude", name: "Claude", color: "#d97706" },
  { id: "gemini", name: "Gemini", color: "#4285F4" },
  { id: "google_ai", name: "Google AI", color: "#34A853" },
] as const;
```

No other changes to this file.

---

## FILE 3 — `src/services/mockScanEngine.ts`

**Only change:** Line 29.

```ts
// OLD
const MODELS: ModelName[] = ["chatgpt", "claude", "perplexity"];

// NEW
const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
```

No other changes to this file.

---

## FILE 4 — `src/app/api/scan/route.ts`

This is the main change. Four surgical edits:

### 4a. Replace `queryPerplexity()` function (lines 118–135)

Delete the entire `queryPerplexity` function and replace with two new functions. Insert both in the same location (between `queryClaude` and `isMentioned`):

```ts
// DELETE THIS:
async function queryPerplexity(prompt: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 600,
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// REPLACE WITH:
async function queryGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 600 },
      }),
    }
  );
  if (!res.ok) return "";
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function queryGoogleAI(prompt: string): Promise<string> {
  // TODO: Configure SERP API service (e.g. SerpAPI, ValueSERP, Bright Data)
  // to extract Google AI Overview text. Swap the endpoint and response parsing here.
  const SERP_API_ENDPOINT = "https://serpapi.com/search.json"; // <-- change if using different provider
  const res = await fetch(
    `${SERP_API_ENDPOINT}?engine=google&q=${encodeURIComponent(prompt)}&api_key=${process.env.GOOGLE_AI_OVERVIEW_API_KEY}`,
    { method: "GET" }
  );
  if (!res.ok) return "";
  const data = await res.json();
  // TODO: Verify response shape matches your SERP provider's AI Overview format
  const blocks: { snippet?: string }[] = data.ai_overview?.text_blocks ?? [];
  return blocks.map((b) => b.snippet ?? "").join(" ").trim();
}
```

### 4b. Update env var checks (lines 263–265)

```ts
// OLD
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasClaude = !!process.env.ANTHROPIC_API_KEY;
const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

// NEW
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasClaude = !!process.env.ANTHROPIC_API_KEY;
const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
const hasGoogleAI = !!process.env.GOOGLE_AI_OVERVIEW_API_KEY;
```

### 4c. Update the no-keys guard (line 267)

```ts
// OLD
if (!hasOpenAI && !hasClaude && !hasPerplexity) {

// NEW
if (!hasOpenAI && !hasClaude && !hasGemini && !hasGoogleAI) {
```

### 4d. Update the models array and routing switch (lines 272–289)

```ts
// OLD
const models: { name: ModelName; enabled: boolean }[] = [
  { name: "chatgpt", enabled: hasOpenAI },
  { name: "claude", enabled: hasClaude },
  { name: "perplexity", enabled: hasPerplexity },
];
// ...
if (model === "chatgpt") responseText = await queryOpenAI(prompt);
else if (model === "claude") responseText = await queryClaude(prompt);
else if (model === "perplexity") responseText = await queryPerplexity(prompt);

// NEW
const models: { name: ModelName; enabled: boolean }[] = [
  { name: "chatgpt", enabled: hasOpenAI },
  { name: "claude", enabled: hasClaude },
  { name: "gemini", enabled: hasGemini },
  { name: "google_ai", enabled: hasGoogleAI },
];
// ...
if (model === "chatgpt") responseText = await queryOpenAI(prompt);
else if (model === "claude") responseText = await queryClaude(prompt);
else if (model === "gemini") responseText = await queryGemini(prompt);
else if (model === "google_ai") responseText = await queryGoogleAI(prompt);
```

---

## FILE 5 — `src/components/organisms/ModelBreakdownCard.tsx`

**Only change:** Lines 4 and 13–17, the import and `modelConfig` object.

The current icon imports are `MessageSquare, Brain, Search` from lucide-react. Keep `MessageSquare` and `Brain`. Replace `Search` with `Globe` and `Globe2` (or use `Globe` for both new models — pick the closest available lucide icons).

```ts
// OLD import line 4:
import { MessageSquare, Brain, Search } from "lucide-react";

// NEW import line 4:
import { MessageSquare, Brain, Globe, Globe2 } from "lucide-react";

// OLD modelConfig lines 13–17:
const modelConfig: Record<
  ModelName,
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  chatgpt: { icon: MessageSquare, label: "ChatGPT", color: "#10a37f" },
  claude: { icon: Brain, label: "Claude", color: "#d97706" },
  perplexity: { icon: Search, label: "Perplexity", color: "#22d3ee" },
};

// NEW modelConfig:
const modelConfig: Record<
  ModelName,
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  chatgpt: { icon: MessageSquare, label: "ChatGPT", color: "#10a37f" },
  claude: { icon: Brain, label: "Claude", color: "#d97706" },
  gemini: { icon: Globe, label: "Gemini", color: "#4285F4" },
  google_ai: { icon: Globe2, label: "Google AI", color: "#34A853" },
};
```

No other changes to this file.

---

## FILE 6 — `src/components/organisms/PromptResultItem.tsx`

**Only change:** Lines 15–20, the `MODEL_ORDER` array and `MODEL_LABELS` record.

```ts
// OLD
const MODEL_ORDER: ModelName[] = ["chatgpt", "claude", "perplexity"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  perplexity: "Pplx",
};

// NEW
const MODEL_ORDER: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Goog",
};
```

No other changes to this file.

---

## FILE 7 — `src/features/dashboard/pages/ModelBreakdownSection.tsx`

**Two changes:**

### 7a. Line 7 — MODELS array

```ts
// OLD
const MODELS: ModelName[] = ["chatgpt", "claude", "perplexity"];

// NEW
const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
```

### 7b. Line 25 — grid columns (4 cards now instead of 3)

```tsx
// OLD
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// NEW
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## FILE 8 — `src/features/dashboard/pages/CompetitorBenchmarkSection.tsx`

**Only change:** Lines 9–14, the `MODELS` array and `MODEL_LABELS` record.

```ts
// OLD
const MODELS: ModelName[] = ["chatgpt", "claude", "perplexity"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  perplexity: "Pplx",
};

// NEW
const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Goog",
};
```

No other changes to this file.

---

## FILE 9 — `src/features/dashboard/pages/GaugeSection.tsx`

**Only change:** Line 104, the scanning status text.

```tsx
// OLD
Querying ChatGPT, Claude &amp; Perplexity

// NEW
Querying ChatGPT, Claude, Gemini &amp; Google AI
```

No other changes to this file.

---

## FILE 10 — `src/features/landing/sections/HowItWorksSection.tsx`

**Only change:** Line 35, inside the `timelineSteps` description for step 02.

```ts
// OLD
"Surven generates realistic consumer prompts and queries ChatGPT, Claude, and Perplexity to see who gets recommended.",

// NEW
"Surven generates realistic consumer prompts and queries ChatGPT, Claude, Gemini, and Google AI to see who gets recommended.",
```

No other changes to this file.

---

## FILE 11 — `src/features/landing/sections/FeaturesSection.tsx`

**Only change:** Line 22, inside the `multimodel` feature tooltip.

```ts
// OLD
"We check every major AI tool — ChatGPT, Claude, and Perplexity — all at once. Different AI tools give different answers, so we cover all of them so nothing slips through.",

// NEW
"We check every major AI tool — ChatGPT, Claude, Gemini, and Google AI — all at once. Different AI tools give different answers, so we cover all of them so nothing slips through.",
```

No other changes to this file.

---

## FILE 12 — `src/features/landing/sections/HeroSection.tsx`

**Only change:** Line 71, the subheading paragraph.

```tsx
// OLD
Surven tracks your visibility across ChatGPT, Claude, Perplexity, and more — so
you can show up where your customers are searching.

// NEW
Surven tracks your visibility across ChatGPT, Claude, Gemini, Google AI, and more — so
you can show up where your customers are searching.
```

No other changes to this file.

---

## FILE 13 — `src/app/layout.tsx`

**Two changes:** Lines 20 and 27, the metadata description and keywords array.

```ts
// OLD description (line 20):
"Track your business visibility across ChatGPT, Claude, Perplexity, and more. See if AI is recommending your business.",

// NEW description:
"Track your business visibility across ChatGPT, Claude, Gemini, Google AI, and more. See if AI is recommending your business.",

// OLD keywords (lines 21–28):
keywords: [
  "AI visibility",
  "GEO",
  "generative engine optimization",
  "ChatGPT",
  "Claude",
  "Perplexity",
],

// NEW keywords:
keywords: [
  "AI visibility",
  "GEO",
  "generative engine optimization",
  "ChatGPT",
  "Claude",
  "Gemini",
  "Google AI",
  "Google AI Overview",
],
```

---

## Environment Variables

**Remove from `.env.local`:**
```
PERPLEXITY_API_KEY
```

**Add to `.env.local`** (leave values blank until keys are obtained):
```
GOOGLE_GEMINI_API_KEY=
GOOGLE_AI_OVERVIEW_API_KEY=
```

**Update `.env.local.example`** to match the same structure (remove `PERPLEXITY_API_KEY`, add both Google vars with placeholder values).

---

## TypeScript Verification

After all edits, run:
```bash
npx tsc --noEmit
```

The type system will catch any missed `perplexity` references since `ModelName` no longer includes it. Fix any reported errors before finishing.

---

## Summary Checklist

- [ ] `src/types/database.ts` — ModelName union type
- [ ] `src/utils/constants.ts` — AI_MODELS array
- [ ] `src/services/mockScanEngine.ts` — MODELS array
- [ ] `src/app/api/scan/route.ts` — delete queryPerplexity, add queryGemini + queryGoogleAI, update env checks + models array + routing switch
- [ ] `src/components/organisms/ModelBreakdownCard.tsx` — icons + modelConfig
- [ ] `src/components/organisms/PromptResultItem.tsx` — MODEL_ORDER + MODEL_LABELS
- [ ] `src/features/dashboard/pages/ModelBreakdownSection.tsx` — MODELS array + grid columns
- [ ] `src/features/dashboard/pages/CompetitorBenchmarkSection.tsx` — MODELS + MODEL_LABELS
- [ ] `src/features/dashboard/pages/GaugeSection.tsx` — scanning status text
- [ ] `src/features/landing/sections/HowItWorksSection.tsx` — step 02 description
- [ ] `src/features/landing/sections/FeaturesSection.tsx` — multimodel tooltip
- [ ] `src/features/landing/sections/HeroSection.tsx` — subheading text
- [ ] `src/app/layout.tsx` — metadata description + keywords
- [ ] `.env.local` — remove PERPLEXITY_API_KEY, add two Google vars
- [ ] `.env.local.example` — same as above
- [ ] Run `npx tsc --noEmit` and fix any remaining `perplexity` references
