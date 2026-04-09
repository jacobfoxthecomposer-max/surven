import { NextRequest, NextResponse } from "next/server";
import type { ModelName } from "@/types/database";

type Sentiment = "positive" | "neutral" | "negative";

async function analyzeSentiment(
  responseText: string,
  businessName: string
): Promise<Sentiment> {
  if (!process.env.ANTHROPIC_API_KEY) return "neutral";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `How is "${businessName}" portrayed in the following AI response? Reply with exactly one word: positive, neutral, or negative.\n\nResponse: ${responseText.slice(0, 600)}`,
          },
        ],
      }),
    });
    if (!res.ok) return "neutral";
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").toLowerCase().trim();
    if (text.includes("positive")) return "positive";
    if (text.includes("negative")) return "negative";
    return "neutral";
  } catch {
    return "neutral";
  }
}

const PROMPT_TEMPLATES = [
  "What are the best {industry}s in {location}?",
  "Can you recommend a good {industry} near {location}?",
  "Who are the top rated {industry}s in {location}?",
  "I'm looking for a {industry} in {location}, who should I go to?",
  "What {industry} in {location} has the best reviews?",
  "Which {industry}s in {location} do you recommend for someone new to the area?",
];

function generatePrompts(
  industry: string,
  city: string,
  state: string,
  customPrompts: string[]
): string[] {
  const location = `${city}, ${state}`;
  const generated = PROMPT_TEMPLATES.map((t) =>
    t.replace("{industry}", industry.toLowerCase()).replace("{location}", location)
  );
  return [...generated, ...customPrompts];
}

async function queryOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 600,
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function queryClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

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

function isMentioned(response: string, name: string): boolean {
  return response.toLowerCase().includes(name.toLowerCase());
}

function extractCitations(text: string): string[] {
  const urlRegex = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)/g;
  const domains = new Set<string>();
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    domains.add(match[1].toLowerCase());
  }
  return Array.from(domains);
}

type RawResult = {
  prompt_text: string;
  model_name: ModelName;
  response_text: string;
  business_mentioned: boolean;
  competitor_mentions: Record<string, boolean>;
  sentiment: Sentiment | null;
  citations: string[] | null;
};

export async function POST(request: NextRequest) {
  const { businessName, industry, city, state, competitors, customPrompts = [] } =
    await request.json() as {
      businessName: string;
      industry: string;
      city: string;
      state: string;
      competitors: string[];
      customPrompts?: string[];
    };

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;

  if (!hasOpenAI && !hasClaude && !hasPerplexity) {
    return NextResponse.json({ useMock: true });
  }

  const prompts = generatePrompts(industry, city, state, customPrompts);
  const models: { name: ModelName; enabled: boolean }[] = [
    { name: "chatgpt", enabled: hasOpenAI },
    { name: "claude", enabled: hasClaude },
    { name: "perplexity", enabled: hasPerplexity },
  ];

  const tasks: Promise<RawResult>[] = [];

  for (const prompt of prompts) {
    for (const { name: model, enabled } of models) {
      if (!enabled) continue;
      tasks.push(
        (async (): Promise<RawResult> => {
          let responseText = "";
          try {
            if (model === "chatgpt") responseText = await queryOpenAI(prompt);
            else if (model === "claude") responseText = await queryClaude(prompt);
            else if (model === "perplexity") responseText = await queryPerplexity(prompt);
          } catch {
            // empty response = not mentioned
          }

          const competitorMentions: Record<string, boolean> = {};
          for (const comp of competitors) {
            competitorMentions[comp] = responseText ? isMentioned(responseText, comp) : false;
          }

          const businessMentioned = responseText ? isMentioned(responseText, businessName) : false;

          return {
            prompt_text: prompt,
            model_name: model,
            response_text: responseText,
            business_mentioned: businessMentioned,
            competitor_mentions: competitorMentions,
            sentiment: null as Sentiment | null, // filled in below
            citations: responseText ? extractCitations(responseText) : null,
          };
        })()
      );
    }
  }

  const results = await Promise.all(tasks);

  // Run sentiment analysis in parallel for all mentions
  await Promise.all(
    results.map(async (r) => {
      if (r.business_mentioned && r.response_text) {
        r.sentiment = await analyzeSentiment(r.response_text, businessName);
      }
    })
  );

  const mentionCount = results.filter((r) => r.business_mentioned).length;
  const visibilityScore = Math.round((mentionCount / results.length) * 100);

  // Compute per-model visibility scores
  const enabledModels = models.filter((m) => m.enabled);
  const modelScores: Record<string, number> = {};
  for (const { name } of enabledModels) {
    const modelResults = results.filter((r) => r.model_name === name);
    const mentioned = modelResults.filter((r) => r.business_mentioned).length;
    modelScores[name] = modelResults.length > 0
      ? Math.round((mentioned / modelResults.length) * 100)
      : 0;
  }

  return NextResponse.json({ results, visibilityScore, modelScores });
}
