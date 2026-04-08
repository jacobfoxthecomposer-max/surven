/**
 * Mock Scan Engine — Surven MVP
 *
 * Generates realistic AI visibility scan results.
 * Clearly separated so it can be swapped for real API calls later.
 *
 * Each scan:
 * 1. Generates 6 natural consumer prompts
 * 2. Simulates responses from ChatGPT, Claude, Perplexity
 * 3. Randomly includes/excludes business & competitor mentions
 * 4. Calculates visibility score
 */

import type { ScanResult, ModelName } from "@/types/database";

const PROMPT_TEMPLATES = [
  "What are the best {industry}s in {location}?",
  "Can you recommend a good {industry} near {location}?",
  "Who are the top rated {industry}s in {location}?",
  "I'm looking for a {industry} in {location}, who should I go to?",
  "What {industry} in {location} has the best reviews?",
  "Which {industry}s in {location} do you recommend for someone new to the area?",
];

const MODELS: ModelName[] = ["chatgpt", "claude", "perplexity"];

function generatePrompts(industry: string, city: string, state: string): string[] {
  const location = `${city}, ${state}`;
  return PROMPT_TEMPLATES.map((t) =>
    t.replace("{industry}", industry.toLowerCase()).replace("{location}", location)
  );
}

function generateMockResponse(
  prompt: string,
  businessName: string,
  competitors: string[],
  mentioned: boolean,
  mentionedCompetitors: Record<string, boolean>
): string {
  const allBusinesses: string[] = [];
  if (mentioned) allBusinesses.push(businessName);

  for (const [name, isMentioned] of Object.entries(mentionedCompetitors)) {
    if (isMentioned) allBusinesses.push(name);
  }

  // Add some generic filler names
  const fillers = [
    "Summit Services",
    "Premier Solutions",
    "City Center Professionals",
    "Eastside Group",
    "Valley Experts",
  ];
  const extraCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < extraCount; i++) {
    allBusinesses.push(fillers[i % fillers.length]);
  }

  const shuffled = allBusinesses.sort(() => Math.random() - 0.5);

  const intro = [
    "Based on customer reviews and local reputation, here are some top options:",
    "There are several highly-rated options in the area. Here are my recommendations:",
    "I'd suggest looking into the following well-reviewed businesses:",
    "Here are some of the most recommended options based on online reviews and ratings:",
  ];

  const selectedIntro = intro[Math.floor(Math.random() * intro.length)];

  const list = shuffled
    .map((name, i) => `${i + 1}. **${name}** — Known for excellent service and strong customer reviews.`)
    .join("\n");

  return `${selectedIntro}\n\n${list}\n\nI'd recommend checking recent reviews and contacting them directly to see which one best fits your needs.`;
}

export interface MockScanInput {
  businessName: string;
  industry: string;
  city: string;
  state: string;
  competitors: string[];
}

export interface MockScanOutput {
  visibilityScore: number;
  results: Omit<ScanResult, "id" | "scan_id" | "created_at">[];
}

export function runMockScan(input: MockScanInput): MockScanOutput {
  const { businessName, industry, city, state, competitors } = input;
  const prompts = generatePrompts(industry, city, state);

  const results: Omit<ScanResult, "id" | "scan_id" | "created_at">[] = [];
  let mentionCount = 0;
  const totalPossible = prompts.length * MODELS.length;

  for (const prompt of prompts) {
    for (const model of MODELS) {
      // ~40% chance of being mentioned per prompt per model
      const mentioned = Math.random() < 0.4;
      if (mentioned) mentionCount++;

      const competitorMentions: Record<string, boolean> = {};
      for (const comp of competitors) {
        competitorMentions[comp] = Math.random() < 0.35;
      }

      const responseText = generateMockResponse(
        prompt,
        businessName,
        competitors,
        mentioned,
        competitorMentions
      );

      results.push({
        prompt_text: prompt,
        model_name: model,
        response_text: responseText,
        business_mentioned: mentioned,
        competitor_mentions: competitorMentions,
      });
    }
  }

  const visibilityScore = Math.round((mentionCount / totalPossible) * 100);

  return { visibilityScore, results };
}
