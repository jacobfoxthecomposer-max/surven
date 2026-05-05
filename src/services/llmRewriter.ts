/**
 * LLM-powered content rewriter — handles Sprint 1 features:
 *   - Meta description rewrite (GEO-optimized)
 *   - Title tag rewrite (GEO-optimized)
 *   - FAQ Q&A pair generation (Sprint 1 #4 — used later)
 *   - Alt text generation (Sprint 1 #5 — used later)
 *
 * Each rewriter uses tight, JSON-mode prompts so output is parseable.
 * Models are currently hardcoded to gpt-4o-mini via openaiClient.ts.
 */

import { openaiChatJson } from "./openaiClient";
import type { PageContext } from "./schemaGenerator";

interface RewriteResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const META_SYSTEM = `You rewrite website meta descriptions so AI engines (ChatGPT, Claude, Gemini, Google AI) are more likely to cite the site when answering questions about businesses like it.

CRITICAL RULES — NEVER VIOLATE:
- The current <title> and meta description tell you WHAT THE WEBSITE IS. Treat them as ground truth for the page's subject.
- The rewritten description MUST be about the same entity as the current title/description. You can rephrase, but NOT change the subject.
- If the page content mentions other names, businesses, or entities, those are usually CONTENT the page displays — not the page's own identity. Don't describe THEM unless the current title makes clear they ARE the page's subject.
- NEVER invent facts that aren't in the source data
- NEVER add a city / state / address unless one is explicitly in the BUSINESS DATA section
- NEVER guess at company structure (e.g. "GitHub hosts X's project") — describe the business itself
- If you don't have enough information for a strong description, write a shorter, simpler one
- If the existing description is already accurate and well-written, return something close to it (only fix length / clarity issues)

Style rules:
- 140-160 characters total (no shorter, no longer)
- Lead with what the business does
- Include city/state ONLY if explicitly given in BUSINESS DATA
- Mention 1-2 concrete products / services / categories
- AVOID buzzwords: "world-class", "cutting-edge", "industry-leading", "passionate about", "best-in-class", "synergy", "innovative solutions"
- AVOID hedge words: "we believe", "we strive", "we aim", "may be", "could be"
- Read like a direct factual answer to "What is [business name]?"
- Plain prose, no emoji, no marketing fluff

Return ONLY JSON: {"description": "your rewritten text"}`;

const TITLE_SYSTEM = `You rewrite website <title> tags so AI engines and search engines understand the business better and cite it more often.

CRITICAL RULES — NEVER VIOLATE:
- The current <title> tag tells you WHAT THE WEBSITE IS. Treat it as ground truth for the page's subject.
- The rewritten title MUST be about the same entity / brand / product as the existing title. You can rephrase, but NOT change the subject.
- If the page content mentions other names, businesses, or entities, those are usually CONTENT the page displays — not the page's own identity. Don't treat them as the website's subject.
- NEVER invent facts that aren't in the source data
- NEVER add a city / state unless explicitly in BUSINESS DATA AND the existing title implies a local business
- NEVER guess at organizational details (e.g. "GitHub hosts X's project")
- If the existing title is already accurate and well-formed (50-65 chars, descriptive, no buzzwords), return something nearly identical with at most cosmetic improvements.

Style rules:
- 50-65 characters total
- Format options: "[Brand Name] | [Specific Offering]" or "[Brand Name] — [What They Do]"
- If the existing title and BUSINESS DATA both confirm a local business with a city: "[Service] in [City] | [Brand]" works well
- Include the business name + their primary category/service
- AVOID buzzwords: "world-class", "best", "premier", "top-rated"
- AVOID emoji, special characters, ALL CAPS
- Read like a clear headline a real human would write

Return ONLY JSON: {"title": "your rewritten title"}`;

function buildBusinessSummary(ctx: PageContext): string {
  const parts: string[] = [];
  if (ctx.businessName) parts.push(`Business: ${ctx.businessName}`);
  if (ctx.url) parts.push(`URL: ${ctx.url}`);
  if (ctx.title) parts.push(`Current <title>: "${ctx.title}"`);
  if (ctx.description) parts.push(`Current meta description: "${ctx.description}"`);
  if (ctx.address) {
    const a = ctx.address;
    const loc = [a.city, a.region].filter(Boolean).join(", ");
    if (loc) parts.push(`Location: ${loc}`);
    if (a.street) parts.push(`Address: ${a.street}${loc ? ", " + loc : ""}`);
  }
  if (ctx.phone) parts.push(`Phone: ${ctx.phone}`);
  if (ctx.serviceItems && ctx.serviceItems.length > 0) {
    parts.push(`Services: ${ctx.serviceItems.slice(0, 5).map((s) => s.name).join(", ")}`);
  }
  if (ctx.productItems && ctx.productItems.length > 0) {
    parts.push(`Products: ${ctx.productItems.slice(0, 5).map((p) => p.name).join(", ")}`);
  }
  return parts.join("\n");
}

function buildPageContent(ctx: PageContext, maxChars = 1500): string {
  const body = ctx.bodyContent ?? "";
  return body.length > maxChars ? body.slice(0, maxChars) + "…" : body;
}

export async function rewriteMetaDescription(ctx: PageContext): Promise<RewriteResult<{ description: string }>> {
  const businessSummary = buildBusinessSummary(ctx);
  const pageContent = buildPageContent(ctx);

  if (!ctx.businessName && !ctx.title && !pageContent) {
    return { ok: false, error: "Not enough page data to write a meta description (no business name or page content found)" };
  }

  const userPrompt = `BUSINESS DATA:
${businessSummary}

PAGE CONTENT (first 1500 chars):
${pageContent || "(no extractable body content)"}

Write a fresh meta description following the rules. Output JSON only.`;

  const result = await openaiChatJson<{ description: string }>({
    messages: [
      { role: "system", content: META_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 200,
    temperature: 0.5,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "LLM did not return a valid response" };
  }

  const text = (result.data.description ?? "").trim();
  if (text.length < 50) {
    return { ok: false, error: "Generated description was too short" };
  }
  if (text.length > 200) {
    return { ok: true, data: { description: text.slice(0, 158) + "…" } };
  }

  return { ok: true, data: { description: text } };
}

const FAQ_SYSTEM = `You generate FAQPage Q&A pairs from a website's content so AI engines (ChatGPT, Claude, Gemini, Google AI) can cite the site for question-shaped queries.

CRITICAL RULES — NEVER VIOLATE:
- The current <title> tag tells you what THE WEBSITE IS. Generate Q&A about that website's subject only.
- If the page content mentions other businesses, products, or entities, those are usually CONTENT the page DISPLAYS — not what the site is about. Don't write Q&A as if those entities are the site's subject.
- NEVER invent specifics, prices, addresses, names, or claims that aren't in the page content
- If you can't write a confident, factual answer from the data, OMIT that pair entirely

Rules for your output:
- 5-10 question/answer pairs total (fewer is fine if the data is thin)
- If the page already has visible Q&A content, EXTRACT and reformat those — don't invent new ones
- If the page has NO visible Q&A, GENERATE pairs that reflect what the page actually covers about the website's subject
- Questions should sound like real user queries (start with: How, What, Why, Where, When, Do, Can, Is, Does)
- Answers must be 1-3 sentences, factual, drawn from the page content
- AVOID: marketing fluff, hedge words, made-up specifics
- Fewer good pairs beats more weak ones

Return ONLY JSON: {"pairs": [{"question": "...", "answer": "..."}]}`;

export async function generateFaqPairs(ctx: PageContext): Promise<RewriteResult<{ pairs: Array<{ question: string; answer: string }> }>> {
  const businessSummary = buildBusinessSummary(ctx);
  const pageContent = buildPageContent(ctx, 4000);

  if (!pageContent && (!ctx.faqItems || ctx.faqItems.length === 0)) {
    return { ok: false, error: "Not enough page content to generate Q&A pairs" };
  }

  const existingFaq = ctx.faqItems && ctx.faqItems.length > 0
    ? `\nEXISTING Q&A ON PAGE (extract from these if they're good):\n${ctx.faqItems.slice(0, 15).map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`).join("\n")}`
    : "";

  const userPrompt = `BUSINESS DATA:
${businessSummary}

PAGE CONTENT (first 4000 chars):
${pageContent || "(no extractable body content)"}
${existingFaq}

Generate the FAQPage Q&A pairs following the rules. Output JSON only.`;

  const result = await openaiChatJson<{ pairs: Array<{ question: string; answer: string }> }>({
    messages: [
      { role: "system", content: FAQ_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 1500,
    temperature: 0.4,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "LLM did not return a valid response" };
  }

  const pairs = (result.data.pairs ?? []).filter(
    (p) => p && typeof p.question === "string" && typeof p.answer === "string" && p.question.length > 5 && p.answer.length > 10,
  );

  if (pairs.length === 0) {
    return { ok: false, error: "Generated Q&A pairs were empty or malformed" };
  }

  return { ok: true, data: { pairs: pairs.slice(0, 12) } };
}

const ALT_TEXT_SYSTEM = `You write concise alt text for images on websites. Alt text helps screen readers describe images to blind users AND helps AI engines (ChatGPT, Claude, Gemini) understand what's on the page.

CRITICAL RULES — NEVER VIOLATE:
- ONLY describe what is CLEARLY visible. Never guess at details that aren't sharp / readable.
- If text on the image isn't clearly legible, write "a sign with text" or omit the text entirely. NEVER invent words you can't read.
- Don't speculate about identity ("a man standing") — describe what's visible, not who.
- If the image is unclear, low-res, or you can't make out the subject, return: {"alt": ""} — empty alt is fine, fabricated alt is not.

Rules for your output:
- 80-125 characters, single sentence, no quotes
- Describe what's actually visible (objects, scene, layout)
- Lead with the most important element
- Don't start with "Image of..." or "Picture showing..." — go straight to the description
- If text on the image IS clearly readable, include the exact text
- Plain English, no marketing fluff

Return ONLY JSON: {"alt": "your alt text"}`;

export async function generateAltText(imageUrl: string, context?: { surroundingText?: string; pageTitle?: string }): Promise<RewriteResult<{ alt: string }>> {
  const contextLine = context?.surroundingText
    ? `Surrounding text on the page: "${context.surroundingText.slice(0, 300)}"`
    : "";
  const titleLine = context?.pageTitle ? `Page title: "${context.pageTitle}"` : "";

  const userParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } }> = [
    {
      type: "text",
      text: `Write alt text for this image.\n${titleLine}\n${contextLine}\n\nReturn JSON only.`,
    },
    {
      type: "image_url",
      image_url: { url: imageUrl, detail: "low" },
    },
  ];

  const result = await openaiChatJson<{ alt: string }>({
    messages: [
      { role: "system", content: ALT_TEXT_SYSTEM },
      { role: "user", content: userParts },
    ],
    maxTokens: 150,
    temperature: 0.3,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "Vision model didn't return a valid response" };
  }

  const alt = (result.data.alt ?? "").trim().replace(/^["']|["']$/g, "");
  if (alt.length < 10) {
    return { ok: false, error: "Image was too unclear or low-resolution for AI to describe confidently. Add alt text manually for this one." };
  }
  if (alt.length > 200) {
    return { ok: true, data: { alt: alt.slice(0, 130).trim() } };
  }

  return { ok: true, data: { alt } };
}

/**
 * Batch rewriter for duplicate <title> tags.
 *
 * Accepts N pages that currently share a title and asks the LLM to write a DISTINCT
 * title for each — one call so the model can see all pages at once and differentiate.
 * Without batching, calling rewriteTitleTag() N times can produce two pages with the
 * same generated title (the model has no way to know what its sibling pages got).
 */
const DUP_TITLES_SYSTEM = `You rewrite multiple <title> tags at once for pages on the same site that currently share an identical title. Each page must end up with a DISTINCT, descriptive title that reflects what makes that specific page different from the others.

CRITICAL RULES — NEVER VIOLATE:
- The current shared title tells you the OVERALL website / entity. Each rewritten title MUST stay about that same entity / brand. You can rephrase, but NOT change the subject.
- The page content (body excerpt) tells you what makes each page distinct (a service, location, blog topic, product line). Use that to differentiate.
- NEVER invent facts not in the source data. NEVER add a city / state unless explicitly in BUSINESS DATA.
- Output one title per input URL, in the same order. Don't return duplicates of each other.

Style rules:
- Each title: 50-65 characters total
- Format: "[Specific Page Topic] | [Brand Name]" or "[Brand Name] — [Specific Page Topic]"
- AVOID buzzwords ("best", "premier", "top-rated"), emoji, ALL CAPS
- Read like clear human-written headlines

Return ONLY JSON: {"titles": [{"url": "...", "title": "..."}, ...]}  with the SAME urls in the SAME order as the input.`;

const DUP_METAS_SYSTEM = `You rewrite multiple meta descriptions at once for pages on the same site that currently share an identical description. Each page must end up with a DISTINCT, useful description that reflects that specific page's content.

CRITICAL RULES — NEVER VIOLATE:
- The current shared description tells you the OVERALL business. Each rewritten description MUST stay about that same business. Rephrase, but don't change the subject.
- The page content (body excerpt) tells you what makes each page distinct. Use that to differentiate.
- NEVER invent facts not in the source data. NEVER add a city / state unless explicitly in BUSINESS DATA.
- Output one description per input URL, in the same order. Don't return duplicates.

Style rules:
- Each description: 140-160 characters total
- Lead with what makes this specific page useful
- AVOID buzzwords ("world-class", "cutting-edge"), hedge words ("we believe", "we strive"), emoji
- Plain prose, factual, like a direct answer

Return ONLY JSON: {"descriptions": [{"url": "...", "description": "..."}, ...]}  with the SAME urls in the SAME order as the input.`;

export interface DuplicatePageInput {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  bodyExcerpt: string; // ~600 chars per page
}

export async function rewriteDuplicateTitles(
  pages: DuplicatePageInput[],
  business: { businessName?: string; address?: { city?: string; region?: string }; phone?: string },
): Promise<RewriteResult<{ titles: Array<{ url: string; title: string }> }>> {
  if (pages.length < 2) {
    return { ok: false, error: "Need at least 2 pages with duplicate titles to batch-rewrite." };
  }
  if (pages.length > 20) {
    return { ok: false, error: "Too many duplicate pages (max 20 per batch)." };
  }

  const summary = [
    business.businessName ? `Business: ${business.businessName}` : null,
    business.address?.city || business.address?.region
      ? `Location: ${[business.address.city, business.address.region].filter(Boolean).join(", ")}`
      : null,
    business.phone ? `Phone: ${business.phone}` : null,
  ].filter(Boolean).join("\n");

  const pagesBlock = pages.map((p, i) => {
    const excerpt = p.bodyExcerpt.length > 600 ? p.bodyExcerpt.slice(0, 600) + "…" : p.bodyExcerpt;
    return `Page ${i + 1}\nURL: ${p.url}\nCurrent shared title: "${p.currentTitle ?? ""}"\nContent excerpt:\n${excerpt}`;
  }).join("\n\n---\n\n");

  const userPrompt = `BUSINESS DATA:\n${summary || "(none)"}\n\n${pagesBlock}\n\nRewrite each page's <title> tag so each is DISTINCT from the others. Output JSON only.`;

  const result = await openaiChatJson<{ titles: Array<{ url: string; title: string }> }>({
    messages: [
      { role: "system", content: DUP_TITLES_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 100 * pages.length + 100,
    temperature: 0.5,
  });

  if (!result.ok || !result.data?.titles) {
    return { ok: false, error: result.error ?? "LLM did not return valid JSON" };
  }

  // Defensive: ensure all input URLs got a title back, in any order.
  const byUrl = new Map(result.data.titles.map((t) => [t.url, (t.title ?? "").trim()]));
  const ordered: Array<{ url: string; title: string }> = [];
  for (const p of pages) {
    const candidate = byUrl.get(p.url);
    if (!candidate || candidate.length < 10) {
      return { ok: false, error: `LLM returned no usable title for ${p.url}` };
    }
    ordered.push({ url: p.url, title: candidate.length > 75 ? candidate.slice(0, 70) : candidate });
  }

  // Sanity: confirm all titles are unique.
  const seen = new Set<string>();
  for (const t of ordered) {
    const lower = t.title.toLowerCase();
    if (seen.has(lower)) return { ok: false, error: "LLM returned duplicate titles for two pages — try again." };
    seen.add(lower);
  }

  return { ok: true, data: { titles: ordered } };
}

export async function rewriteDuplicateMetaDescriptions(
  pages: DuplicatePageInput[],
  business: { businessName?: string; address?: { city?: string; region?: string }; phone?: string },
): Promise<RewriteResult<{ descriptions: Array<{ url: string; description: string }> }>> {
  if (pages.length < 2) {
    return { ok: false, error: "Need at least 2 pages with duplicate meta descriptions to batch-rewrite." };
  }
  if (pages.length > 20) {
    return { ok: false, error: "Too many duplicate pages (max 20 per batch)." };
  }

  const summary = [
    business.businessName ? `Business: ${business.businessName}` : null,
    business.address?.city || business.address?.region
      ? `Location: ${[business.address.city, business.address.region].filter(Boolean).join(", ")}`
      : null,
    business.phone ? `Phone: ${business.phone}` : null,
  ].filter(Boolean).join("\n");

  const pagesBlock = pages.map((p, i) => {
    const excerpt = p.bodyExcerpt.length > 800 ? p.bodyExcerpt.slice(0, 800) + "…" : p.bodyExcerpt;
    return `Page ${i + 1}\nURL: ${p.url}\nCurrent shared description: "${p.currentDescription ?? ""}"\nContent excerpt:\n${excerpt}`;
  }).join("\n\n---\n\n");

  const userPrompt = `BUSINESS DATA:\n${summary || "(none)"}\n\n${pagesBlock}\n\nRewrite each page's meta description so each is DISTINCT from the others. Output JSON only.`;

  const result = await openaiChatJson<{ descriptions: Array<{ url: string; description: string }> }>({
    messages: [
      { role: "system", content: DUP_METAS_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 200 * pages.length + 100,
    temperature: 0.5,
  });

  if (!result.ok || !result.data?.descriptions) {
    return { ok: false, error: result.error ?? "LLM did not return valid JSON" };
  }

  const byUrl = new Map(result.data.descriptions.map((d) => [d.url, (d.description ?? "").trim()]));
  const ordered: Array<{ url: string; description: string }> = [];
  for (const p of pages) {
    const candidate = byUrl.get(p.url);
    if (!candidate || candidate.length < 50) {
      return { ok: false, error: `LLM returned no usable description for ${p.url}` };
    }
    ordered.push({
      url: p.url,
      description: candidate.length > 200 ? candidate.slice(0, 158) + "…" : candidate,
    });
  }

  const seen = new Set<string>();
  for (const d of ordered) {
    const lower = d.description.toLowerCase();
    if (seen.has(lower)) return { ok: false, error: "LLM returned duplicate descriptions for two pages — try again." };
    seen.add(lower);
  }

  return { ok: true, data: { descriptions: ordered } };
}

export async function rewriteTitleTag(ctx: PageContext): Promise<RewriteResult<{ title: string }>> {
  const businessSummary = buildBusinessSummary(ctx);
  const pageContent = buildPageContent(ctx, 1000);

  if (!ctx.businessName && !ctx.title) {
    return { ok: false, error: "Not enough page data to write a title (no business name or current title found)" };
  }

  const userPrompt = `BUSINESS DATA:
${businessSummary}

PAGE CONTENT (first 1000 chars):
${pageContent || "(no extractable body content)"}

Write a fresh <title> tag following the rules. Output JSON only.`;

  const result = await openaiChatJson<{ title: string }>({
    messages: [
      { role: "system", content: TITLE_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 100,
    temperature: 0.5,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "LLM did not return a valid response" };
  }

  const text = (result.data.title ?? "").trim();
  if (text.length < 10) {
    return { ok: false, error: "Generated title was too short" };
  }
  if (text.length > 75) {
    return { ok: true, data: { title: text.slice(0, 70) } };
  }

  return { ok: true, data: { title: text } };
}
