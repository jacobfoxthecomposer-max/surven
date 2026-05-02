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

Rules for your output:
- 140-160 characters total (no shorter, no longer)
- Lead with what the business does + where it's located (specific entities)
- Mention 1-2 concrete products / services / categories
- Use specific names (city, state, business name, signature offering)
- AVOID buzzwords: "world-class", "cutting-edge", "industry-leading", "passionate about", "best-in-class", "synergy", "innovative solutions"
- AVOID hedge words: "we believe", "we strive", "we aim", "may be", "could be"
- Read like a direct factual answer to "What is [business name]?"
- Plain prose, no emoji, no marketing fluff

Return ONLY JSON: {"description": "your rewritten text"}`;

const TITLE_SYSTEM = `You rewrite website <title> tags so AI engines and search engines understand the business better and cite it more often.

Rules for your output:
- 50-65 characters total
- Format options (pick whichever fits best): "[Service/Category] in [City] | [Brand Name]" or "[Brand Name] — [What They Do] in [City]" or "[Brand Name] | [Specific Offering]"
- Include the business name + their primary category/service
- Include city or region if it's a local business
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

Rules for your output:
- 5-10 question/answer pairs total
- If the page already has visible Q&A content, EXTRACT and reformat those — don't invent new ones
- If the page has NO visible Q&A, GENERATE pairs that reflect what the page actually covers
- Questions should sound like real user queries (start with: How, What, Why, Where, When, Do, Can, Is, Does)
- Answers must be 1-3 sentences, factual, drawn from the page content
- AVOID: marketing fluff, hedge words, made-up specifics not in the page
- If the page lacks substance for an answer, omit that pair — fewer good pairs beats more weak ones

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

Rules for your output:
- 80-125 characters, single sentence, no quotes
- Describe what's actually visible (objects, people, scene, key text on the image)
- Lead with the most important element
- Don't start with "Image of..." or "Picture showing..." — go straight to the description
- If the image contains readable text (a sign, logo text, headline), include the exact text
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
    return { ok: false, error: "Generated alt text was too short" };
  }
  if (alt.length > 200) {
    return { ok: true, data: { alt: alt.slice(0, 130).trim() } };
  }

  return { ok: true, data: { alt } };
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
