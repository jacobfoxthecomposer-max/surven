import type { ScanResult, ModelName } from "@/types/database";

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

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

  const fillers = [
    "Summit Services",
    "Premier Solutions",
    "City Center Professionals",
    "Eastside Group",
    "Valley Experts",
  ];
  const extraCount = (Math.floor(Math.random() * 3) + 1);
  for (let i = 0; i < extraCount; i++) {
    allBusinesses.push(fillers[i % fillers.length]);
  }

  const shuffled = allBusinesses.sort(() => Math.random() - 0.5);

  const intros = [
    "Based on customer reviews and local reputation, here are some top options:",
    "There are several highly-rated options in the area. Here are my recommendations:",
    "I'd suggest looking into the following well-reviewed businesses:",
    "Here are some of the most recommended options based on online reviews and ratings:",
  ];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const list = shuffled
    .map((name, i) => `${i + 1}. **${name}** — Known for excellent service and strong customer reviews.`)
    .join("\n");

  return `${intro}\n\n${list}\n\nI'd recommend checking recent reviews and contacting them directly to see which one best fits your needs.`;
}

export interface MockScanInput {
  businessName: string;
  industry: string;
  city: string;
  state: string;
  competitors: string[];
  customPrompts?: string[];
}

export interface MockScanOutput {
  visibilityScore: number;
  results: Omit<ScanResult, "id" | "scan_id" | "created_at">[];
}

export function runMockScan(input: MockScanInput): MockScanOutput {
  const { businessName, industry, city, state, competitors, customPrompts = [] } = input;
  const prompts = [...generatePrompts(industry, city, state), ...customPrompts];

  // Derive a stable base score directly from the business identity — no RNG involved
  const hash = hashString(`${businessName}|${industry}|${city}|${state}`);
  const baseScore = 22 + (hash % 57); // always 22–78% for this business

  // Determine how many of the 18 slots count as "mentioned" to match the base score
  const total = prompts.length * MODELS.length;
  const targetMentions = Math.round((baseScore / 100) * total);

  // Assign mentions to specific prompt+model slots using the hash so it's deterministic
  const mentionSlots = new Set<number>();
  let attempt = 0;
  while (mentionSlots.size < targetMentions) {
    const slot = hashString(`${hash}|${attempt++}`) % total;
    mentionSlots.add(slot);
  }

  // Similarly assign competitor mentions per slot
  const competitorSlotMaps: Record<string, Set<number>> = {};
  for (const comp of competitors) {
    const compHash = hashString(`${hash}|${comp}`);
    const compMentions = new Set<number>();
    let ca = 0;
    const compTarget = Math.round(0.35 * total);
    while (compMentions.size < compTarget) {
      const slot = hashString(`${compHash}|${ca++}`) % total;
      compMentions.add(slot);
    }
    competitorSlotMaps[comp] = compMentions;
  }

  const results: Omit<ScanResult, "id" | "scan_id" | "created_at">[] = [];
  let slot = 0;

  for (const prompt of prompts) {
    for (const model of MODELS) {
      const mentioned = mentionSlots.has(slot);

      const competitorMentions: Record<string, boolean> = {};
      for (const comp of competitors) {
        competitorMentions[comp] = competitorSlotMaps[comp].has(slot);
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

      slot++;
    }
  }

  // Add ±1% noise so it feels like a live scan without actually moving
  const noise = Math.round((Math.random() - 0.5) * 2);
  const visibilityScore = Math.max(0, Math.min(100, baseScore + noise));

  return { visibilityScore, results };
}
