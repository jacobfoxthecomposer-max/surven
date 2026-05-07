import type {
  PromptsData,
  PromptRow,
  PromptResponse,
  IntentCoverage,
  CitationSource,
  SentimentByType,
  InsightItemData,
} from "@/features/dashboard/pages/PromptsSection";
import type { Business, Competitor } from "@/types/database";

const ENGINES = ["chatgpt", "claude", "gemini", "google_ai"] as const;
type EngineId = (typeof ENGINES)[number];

const INTENTS = [
  "Informational",
  "Local",
  "Comparison",
  "Use-case",
  "Transactional",
] as const;
type IntentLabel = (typeof INTENTS)[number];

// ─── Deterministic PRNG seeded from scan id ─────────────────────────────────
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function rint(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function rfloat(rng: () => number, min: number, max: number, decimals = 1): number {
  const v = rng() * (max - min) + min;
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

// ─── Prompt templates per intent, parameterized on industry/brand/city ──────
function brandedLookupPrompts(brand: string, industry: string): string[] {
  const lc = industry.toLowerCase();
  return [
    `${brand} reviews`,
    `is ${brand} a good ${lc}`,
    `${brand} hours`,
    `${brand} menu`,
  ];
}

function localPrompts(industry: string, city: string): string[] {
  const lc = industry.toLowerCase();
  const cityClause = city ? ` in ${city}` : " near me";
  return [
    `best ${lc}s${cityClause}`,
    `top rated ${lc}${cityClause}`,
    `affordable ${lc}${cityClause}`,
  ];
}

function comparisonPrompts(brand: string, competitors: string[]): string[] {
  if (competitors.length === 0) return [`${brand} vs alternatives`];
  return competitors.slice(0, 2).map((c) => `${brand} vs ${c}`);
}

function informationalPrompts(industry: string, _city: string): string[] {
  const lc = industry.toLowerCase();
  // Pure informational prompts — no geographic modifier so the filter
  // doesn't surface anything that reads as Local. ("How to choose a X in
  // City" is technically informational but users skim it as Local.)
  return [
    `what to look for in a ${lc}`,
    `how to choose a ${lc}`,
    `questions to ask a ${lc} before hiring`,
    `${lc} pricing explained`,
  ];
}

function transactionalPrompts(brand: string, industry: string): string[] {
  const lc = industry.toLowerCase();
  return [
    `${lc} reservations near me`,
    `book ${brand}`,
    `${brand} pricing`,
  ];
}

function useCasePrompts(industry: string): string[] {
  const lc = industry.toLowerCase();
  // Problem-framed prompts — "best for X", "how do I…" jobs-to-be-done.
  return [
    `best ${lc} for first-time clients`,
    `how do I find a reliable ${lc}`,
    `top ${lc} for small businesses`,
  ];
}

// ─── Per-engine excerpt templates ───────────────────────────────────────────
function brandLookupExcerpt(
  engine: EngineId,
  brand: string,
  industry: string,
  cited: boolean,
  competitors: string[]
): string {
  const lc = industry.toLowerCase();
  const comp = competitors[0] ?? "local options";
  if (cited) {
    switch (engine) {
      case "chatgpt":
        return `${brand} has consistently strong reviews — clients cite ${lc} quality, attentive service, and a memorable experience worth returning for.`;
      case "claude":
        return `${brand} reviews are largely positive across Google, Yelp, and TripAdvisor with high marks on the ${lc} experience and atmosphere.`;
      case "gemini":
        return `${brand} earns strong reviews across major platforms, with consistent praise for the ${lc} and overall guest experience.`;
      case "google_ai":
        return `${brand} averages 4.5+ stars on Google with hundreds of reviews highlighting the ${lc} and service quality.`;
    }
  }
  switch (engine) {
    case "chatgpt":
      return `Top ${lc}s in the area include ${comp} and several other well-reviewed local picks.`;
    case "claude":
      return `Highly rated ${lc}s nearby: ${comp}, plus a few additional local favorites.`;
    case "gemini":
      return `Reviews show strong options including ${comp} as a top local choice.`;
    case "google_ai":
      return `Top-rated ${lc}s: ${comp} and other recommended local spots.`;
  }
}

function localExcerpt(
  engine: EngineId,
  brand: string,
  industry: string,
  city: string,
  cited: boolean,
  competitors: string[]
): string {
  const lc = industry.toLowerCase();
  const cityLabel = city || "the area";
  const compList = competitors.slice(0, 3).join(", ") || "several local options";
  if (cited) {
    switch (engine) {
      case "chatgpt":
        return `Top ${lc}s in ${cityLabel} include ${brand}, ${compList}.`;
      case "claude":
        return `Best ${lc}s in ${cityLabel}: ${brand}, ${compList} — all well-reviewed locally.`;
      case "gemini":
        return `Recommended ${lc}s in ${cityLabel} feature ${brand} alongside ${compList}.`;
      case "google_ai":
        return `${cityLabel} ${lc}s with strong reviews: ${brand}, ${compList}.`;
    }
  }
  switch (engine) {
    case "chatgpt":
      return `Top ${lc}s in ${cityLabel}: ${compList}.`;
    case "claude":
      return `Highly rated ${lc}s in ${cityLabel} include ${compList}.`;
    case "gemini":
      return `Best ${lc}s in ${cityLabel}: ${compList}.`;
    case "google_ai":
      return `${cityLabel} ${lc}s: ${compList}.`;
  }
}

function comparisonExcerpt(
  engine: EngineId,
  brand: string,
  competitor: string,
  cited: boolean
): string {
  if (cited) {
    switch (engine) {
      case "chatgpt":
        return `${brand} vs ${competitor}: ${brand} stands out for service quality, while ${competitor} draws more on volume.`;
      case "claude":
        return `Comparing ${brand} and ${competitor}: ${brand} earns stronger sentiment on customer service; ${competitor} has wider name recognition.`;
      case "gemini":
        return `${brand} vs ${competitor}: ${brand} differentiates on experience; ${competitor} on reach.`;
      case "google_ai":
        return `${brand} and ${competitor} both rate well, with ${brand} edging on guest experience.`;
    }
  }
  switch (engine) {
    case "chatgpt":
      return `${competitor} is a well-known option in the category with strong overall ratings.`;
    case "claude":
      return `${competitor} ranks highly in this category with broad name recognition.`;
    case "gemini":
      return `${competitor} is among the leading options in this space.`;
    case "google_ai":
      return `${competitor} averages strong reviews and high search volume.`;
  }
}

function informationalExcerpt(
  engine: EngineId,
  brand: string,
  industry: string,
  cited: boolean
): string {
  const lc = industry.toLowerCase();
  if (cited) {
    switch (engine) {
      case "chatgpt":
        return `When choosing a ${lc}, look at reviews, location, and consistency. ${brand} is a good example of a well-reviewed local option.`;
      case "claude":
        return `Choosing a ${lc}: prioritize review quality, transparent pricing, and consistency. ${brand} is frequently mentioned as a strong choice.`;
      case "gemini":
        return `Look for ${lc}s with strong reviews and clear service. ${brand} fits that profile.`;
      case "google_ai":
        return `Top criteria for picking a ${lc}: reviews, location, value. ${brand} ranks well across these.`;
    }
  }
  switch (engine) {
    case "chatgpt":
      return `When choosing a ${lc}, focus on review consistency, location, and pricing transparency.`;
    case "claude":
      return `Steps to pick a ${lc}: read reviews, check location, compare a few options before deciding.`;
    case "gemini":
      return `Choose a ${lc} by checking ratings, distance, and recent guest feedback.`;
    case "google_ai":
      return `${lc} selection tips: reviews, proximity, value — compare 2–3 before committing.`;
  }
}

function transactionalExcerpt(
  engine: EngineId,
  brand: string,
  industry: string,
  cited: boolean,
  competitors: string[]
): string {
  const lc = industry.toLowerCase();
  const comp = competitors[0] ?? "other local options";
  if (cited) {
    switch (engine) {
      case "chatgpt":
        return `${brand} accepts reservations through their website and major booking platforms — pricing is in line with comparable ${lc}s.`;
      case "claude":
        return `${brand} can be booked directly via their site or by phone. Pricing reflects standard ${lc} rates in the area.`;
      case "gemini":
        return `${brand} offers online reservations and phone booking with transparent pricing.`;
      case "google_ai":
        return `${brand} bookings: available online, by phone, and via standard reservation platforms.`;
    }
  }
  switch (engine) {
    case "chatgpt":
      return `Most ${lc}s in the area accept online reservations. ${comp} is a frequently booked option.`;
    case "claude":
      return `${lc} reservations: try ${comp} or check OpenTable / Google for availability.`;
    case "gemini":
      return `Most ${lc}s offer online booking — ${comp} is among the popular picks.`;
    case "google_ai":
      return `Reservations available at ${comp} and similar local ${lc}s via standard platforms.`;
  }
}

function buildExcerpt(
  engine: EngineId,
  intent: IntentLabel,
  isBranded: boolean,
  brand: string,
  industry: string,
  city: string,
  cited: boolean,
  competitors: string[],
  comparisonTarget?: string
): string {
  // Branded prompts always render with the brand-specific excerpt regardless
  // of canonical intent (most map to Informational under the new taxonomy).
  if (isBranded) {
    return brandLookupExcerpt(engine, brand, industry, cited, competitors);
  }
  switch (intent) {
    case "Local":
      return localExcerpt(engine, brand, industry, city, cited, competitors);
    case "Comparison":
      return comparisonExcerpt(
        engine,
        brand,
        comparisonTarget ?? competitors[0] ?? "competitors",
        cited
      );
    case "Informational":
      return informationalExcerpt(engine, brand, industry, cited);
    case "Use-case":
      return informationalExcerpt(engine, brand, industry, cited);
    case "Transactional":
      return transactionalExcerpt(engine, brand, industry, cited, competitors);
  }
}

// ─── Citation source pool — neutral across industries ──────────────────────
const CITATION_POOL = [
  "Your site",
  "Google",
  "Yelp",
  "Reddit",
  "Industry blogs",
  "News articles",
  "TripAdvisor",
  "Wikipedia",
  "Other",
] as const;

// ─── Generator ─────────────────────────────────────────────────────────────
export function generatePromptsData(
  business: Business,
  competitors: Competitor[],
  scanSeed: string
): PromptsData {
  const seed = hashSeed(`${business.id}-${scanSeed}`);
  const rng = mulberry(seed);
  const compNames = competitors.map((c) => c.name);

  // Build prompt roster: 4 branded + 3 local + 2 comparison + 2 informational + 3 transactional = 14 max
  const promptSpecs: { intent: IntentLabel; type: "branded" | "unbranded"; text: string }[] = [];

  // Branded lookups are still useful as branded-type prompts but their
  // semantic intent maps to Informational under the canonical 5-intent
  // taxonomy (Brand lookup was dropped).
  for (const text of brandedLookupPrompts(business.name, business.industry)) {
    promptSpecs.push({ intent: "Informational", type: "branded", text });
  }
  for (const text of localPrompts(business.industry, business.city)) {
    promptSpecs.push({ intent: "Local", type: "unbranded", text });
  }
  for (const text of comparisonPrompts(business.name, compNames)) {
    promptSpecs.push({ intent: "Comparison", type: "unbranded", text });
  }
  for (const text of informationalPrompts(business.industry, business.city)) {
    promptSpecs.push({ intent: "Informational", type: "unbranded", text });
  }
  for (const text of useCasePrompts(business.industry)) {
    promptSpecs.push({ intent: "Use-case", type: "unbranded", text });
  }
  for (const text of transactionalPrompts(business.name, business.industry)) {
    promptSpecs.push({ intent: "Transactional", type: "unbranded", text });
  }

  // Stratified sample of 10 prompts: take ≥1 from every canonical intent so
  // no intent gets silently dropped from the donut / sentiment-by-type
  // breakdown, then top up the rest with a deterministic shuffle of the
  // remainder.
  const SAMPLE_SIZE = 10;
  const byIntent = new Map<IntentLabel, typeof promptSpecs>();
  for (const intent of INTENTS) byIntent.set(intent, []);
  for (const spec of promptSpecs) {
    byIntent.get(spec.intent)?.push(spec);
  }
  const picked = new Set<typeof promptSpecs[number]>();
  // Round-robin pick: keep cycling intents so each gets fair representation
  // until we reach SAMPLE_SIZE or exhaust the pool.
  let madeProgress = true;
  while (picked.size < SAMPLE_SIZE && madeProgress) {
    madeProgress = false;
    for (const intent of INTENTS) {
      if (picked.size >= SAMPLE_SIZE) break;
      const bucket = byIntent.get(intent) ?? [];
      const next = bucket.find((s) => !picked.has(s));
      if (next) {
        picked.add(next);
        madeProgress = true;
      }
    }
  }
  const shuffled = [...picked].sort(() => rng() - 0.5);

  const prompts: PromptRow[] = shuffled.map((spec, idx) => {
    // Volume pattern: branded smaller (500-3000), local highest (3000-12000), info mid, transactional mid
    let volume: number;
    // Branded type drives the highest hit-prob/lowest-volume bucket; everything
    // else is keyed off intent.
    if (spec.type === "branded") {
      volume = rint(rng, 500, 3500);
    } else {
      switch (spec.intent) {
        case "Local":
          volume = rint(rng, 3000, 12000);
          break;
        case "Comparison":
          volume = rint(rng, 400, 1800);
          break;
        case "Informational":
          volume = rint(rng, 2000, 9000);
          break;
        case "Use-case":
          volume = rint(rng, 1200, 5500);
          break;
        case "Transactional":
          volume = rint(rng, 1500, 6000);
          break;
      }
    }

    // Branded prompts hit more engines on average; transactional/local hit fewer
    const baseHitProb =
      spec.type === "branded"
        ? 0.85
        : spec.intent === "Comparison"
        ? 0.55
        : spec.intent === "Local"
        ? 0.5
        : spec.intent === "Informational"
        ? 0.45
        : spec.intent === "Use-case"
        ? 0.4
        : 0.3; // transactional weakest

    const engineHits: Record<string, boolean> = {};
    let hitCount = 0;
    for (const engine of ENGINES) {
      const hit = rng() < baseHitProb;
      engineHits[engine] = hit;
      if (hit) hitCount++;
    }

    // Position: 1.0–2.0 when strong, 2.5–4.5 when weak, null when 0 hits
    let position: number | null;
    if (hitCount === 0) {
      position = null;
    } else if (spec.type === "branded") {
      position = rfloat(rng, 1.0, 2.2, 1);
    } else {
      position = rfloat(rng, 1.8, 4.5, 1);
    }

    // Sentiment: branded slightly higher, transactional flatter
    const sentBase =
      spec.type === "branded"
        ? 0.6
        : spec.intent === "Comparison"
        ? 0.35
        : spec.intent === "Transactional"
        ? 0.15
        : 0.4;
    const sentiment = hitCount === 0 ? 0 : rfloat(rng, sentBase - 0.2, sentBase + 0.3, 2);

    const coverageDelta = rfloat(rng, -8, 18, 1);

    // Comparison target for excerpt building
    const compTarget =
      spec.intent === "Comparison"
        ? spec.text.split(" vs ")[1]
        : undefined;

    const responses: PromptResponse[] = ENGINES.map((engine) => ({
      engine,
      cited: engineHits[engine],
      excerpt: buildExcerpt(
        engine,
        spec.intent,
        spec.type === "branded",
        business.name,
        business.industry,
        business.city,
        engineHits[engine],
        compNames,
        compTarget
      ),
    }));

    return {
      id: `p${idx + 1}`,
      text: spec.text,
      type: spec.type,
      intent: spec.intent,
      volume,
      engineHits,
      coverageDelta,
      position,
      sentiment,
      responses,
    };
  });

  // ─── Aggregations ─────────────────────────────────────────────────────────
  const intentBuckets = new Map<IntentLabel, PromptRow[]>();
  for (const p of prompts) {
    const bucket = intentBuckets.get(p.intent as IntentLabel) ?? [];
    bucket.push(p);
    intentBuckets.set(p.intent as IntentLabel, bucket);
  }

  const intentCoverage: IntentCoverage[] = [];
  for (const intent of INTENTS) {
    const bucket = intentBuckets.get(intent) ?? [];
    if (bucket.length === 0) continue;
    const totalSlots = bucket.length * ENGINES.length;
    const hitSlots = bucket.reduce(
      (a, p) => a + Object.values(p.engineHits).filter(Boolean).length,
      0
    );
    const coveragePct = Math.round((hitSlots / totalSlots) * 100);
    const volumeMonthly = bucket.reduce((a, p) => a + p.volume, 0);
    const positionsCited = bucket
      .map((p) => p.position)
      .filter((x): x is number => x !== null);
    const avgPosition =
      positionsCited.length > 0
        ? Math.round(
            (positionsCited.reduce((a, x) => a + x, 0) / positionsCited.length) * 10
          ) / 10
        : 0;
    const coverageDelta = rfloat(rng, -6, 14, 1);
    const positiveSentimentPct = Math.round(
      (bucket.filter((p) => p.sentiment > 0.3).length / bucket.length) * 100
    );
    intentCoverage.push({
      intent,
      promptCount: bucket.length,
      coveragePct,
      volumeMonthly,
      avgPosition,
      coverageDelta,
      positiveSentimentPct,
    });
  }

  // Citation sources: distribute weighted with "Your site" leading when branded coverage is high
  const totalMentions = prompts.reduce(
    (a, p) => a + Object.values(p.engineHits).filter(Boolean).length,
    0
  );
  const sourcePcts = [
    rint(rng, 30, 45),
    rint(rng, 18, 26),
    rint(rng, 10, 18),
    rint(rng, 8, 14),
    rint(rng, 5, 10),
    rint(rng, 3, 7),
  ];
  const sourceTotal = sourcePcts.reduce((a, b) => a + b, 0);
  const normalized = sourcePcts.map((p) => Math.round((p / sourceTotal) * 100));
  const remaining = 100 - normalized.reduce((a, b) => a + b, 0);
  normalized[0] += remaining;
  const citationSources: CitationSource[] = CITATION_POOL.slice(0, 6).map((source, i) => ({
    source,
    pct: normalized[i],
    count: Math.max(1, Math.round((normalized[i] / 100) * totalMentions)),
  }));

  // Sentiment by type
  const sentimentByType: SentimentByType[] = intentCoverage.map((ic) => {
    const positive = ic.positiveSentimentPct;
    const negative = rint(rng, 4, 22);
    const neutral = Math.max(0, 100 - positive - negative);
    return {
      type: ic.intent,
      positive,
      neutral,
      negative,
      total: ic.promptCount * ENGINES.length,
    };
  });

  // ─── Headline metrics ─────────────────────────────────────────────────────
  const branded = prompts.filter((p) => p.type === "branded");
  const unbranded = prompts.filter((p) => p.type === "unbranded");
  const brandedTotal = branded.length * ENGINES.length;
  const brandedHits = branded.reduce(
    (a, p) => a + Object.values(p.engineHits).filter(Boolean).length,
    0
  );
  const unbrandedTotal = unbranded.length * ENGINES.length;
  const unbrandedHits = unbranded.reduce(
    (a, p) => a + Object.values(p.engineHits).filter(Boolean).length,
    0
  );
  const brandedVisibility = brandedTotal > 0 ? Math.round((brandedHits / brandedTotal) * 100) : 0;
  const unbrandedVisibility =
    unbrandedTotal > 0 ? Math.round((unbrandedHits / unbrandedTotal) * 100) : 0;

  const linkCitationRate = rint(rng, 32, 58);
  const linkCitationDelta = rfloat(rng, -6, 12, 1);
  const linkCitationMentions = Math.round((linkCitationRate / 100) * totalMentions);

  const positionsCited = prompts
    .map((p) => p.position)
    .filter((x): x is number => x !== null);
  const avgPositionWhenCited =
    positionsCited.length > 0
      ? Math.round(
          (positionsCited.reduce((a, x) => a + x, 0) / positionsCited.length) * 10
        ) / 10
      : 0;

  const overallVisibility = totalMentions / (prompts.length * ENGINES.length);
  const trendDirection: "up" | "down" | "flat" =
    overallVisibility >= 0.55 ? "up" : overallVisibility <= 0.35 ? "down" : "flat";
  const trendWord =
    trendDirection === "up" ? "improving" : trendDirection === "down" ? "slipping" : "holding";

  // ─── Branded engine summary ───────────────────────────────────────────────
  const brandedEngineHits: Record<string, boolean> = {};
  const unbrandedEngineHits: Record<string, boolean> = {};
  for (const engine of ENGINES) {
    brandedEngineHits[engine] = branded.some((p) => p.engineHits[engine]);
    unbrandedEngineHits[engine] = unbranded.some((p) => p.engineHits[engine]);
  }
  const brandedTopRankCount = branded.filter(
    (p) => p.position !== null && p.position <= 1.5
  ).length;
  const brandedTopRankFailEngines = ENGINES.filter((e) => !brandedEngineHits[e]);

  // ─── Wins / concerns derived from the data ────────────────────────────────
  const sortedIntents = [...intentCoverage].sort((a, b) => b.coveragePct - a.coveragePct);
  const strongest = sortedIntents[0];
  const weakest = sortedIntents[sortedIntents.length - 1];
  const biggestRiser = [...intentCoverage].sort(
    (a, b) => b.coverageDelta - a.coverageDelta
  )[0];
  const biggestFaller = [...intentCoverage].sort(
    (a, b) => a.coverageDelta - b.coverageDelta
  )[0];
  const topVolumeMissed = [...prompts]
    .filter((p) => Object.values(p.engineHits).every((v) => !v))
    .sort((a, b) => b.volume - a.volume)[0];
  const topBrandedAllEngines = branded.find((p) =>
    Object.values(p.engineHits).every((v) => v)
  );
  const weakestEngine = [...ENGINES]
    .map((e) => ({
      engine: e,
      hits: prompts.filter((p) => p.engineHits[e]).length,
    }))
    .sort((a, b) => a.hits - b.hits)[0];
  const engineLabels: Record<string, string> = {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    google_ai: "Google AI",
  };

  // Each wins CTA deep-links into /prompts with the right query param so
  // the Tracked Prompts table opens already-filtered + scrolled into
  // view. Intent-themed wins use ?intent=<Label> (matches the filter
  // contract: capitalized labels like "Informational"). The "Inspect
  // prompt" CTA uses ?focus=<text> which the table parses to auto-expand
  // + scroll to + flash the matching row.
  const wins: InsightItemData[] = [];
  if (strongest && strongest.coveragePct >= 50) {
    wins.push({
      iconKey: "crown",
      title: `${strongest.intent} prompts are home turf`,
      description: `${strongest.coveragePct}% coverage on ${strongest.intent.toLowerCase()} searches with #${strongest.avgPosition || "—"} average position. Customers asking these find ${business.name}.`,
      cta: {
        label: `See ${strongest.intent.toLowerCase()} prompts`,
        href: `/prompts?intent=${encodeURIComponent(strongest.intent)}#prompts-table`,
      },
    });
  }
  if (biggestRiser && biggestRiser.coverageDelta > 4) {
    wins.push({
      iconKey: "trend-up",
      title: `${biggestRiser.intent} coverage jumped +${biggestRiser.coverageDelta.toFixed(1)}%`,
      description: `Largest gain across all intents this period — your ${biggestRiser.intent.toLowerCase()} content is paying off. Keep doubling down.`,
      cta: {
        label: `View ${biggestRiser.intent.toLowerCase()} prompts`,
        href: `/prompts?intent=${encodeURIComponent(biggestRiser.intent)}#prompts-table`,
      },
    });
  }
  if (topBrandedAllEngines) {
    wins.push({
      iconKey: "check",
      title: `'${topBrandedAllEngines.text}' on all 4 engines`,
      description: `Your top branded prompt (${(topBrandedAllEngines.volume / 1000).toFixed(1)}K/mo) is hitting 100% coverage with positive sentiment. Brand pages are doing real work.`,
      cta: {
        label: "Inspect this prompt",
        href: `/prompts?focus=${encodeURIComponent(topBrandedAllEngines.text)}#prompts-table`,
      },
    });
  }
  while (wins.length < 3) {
    wins.push({
      iconKey: "check",
      title: `${branded.length} branded prompts tracked`,
      description: `Brand-name searches cover ${brandedVisibility}% of engine slots — solid foundation for direct-intent traffic.`,
      // No URL filter for branded-only currently, so fall back to scroll
      // to the prompts table — at least the user lands on the table.
      cta: { label: "See branded prompts", href: "/prompts#prompts-table" },
    });
  }

  const concerns: InsightItemData[] = [];
  if (topVolumeMissed) {
    concerns.push({
      iconKey: "target",
      title: `${(topVolumeMissed.volume / 1000).toFixed(1)}K/mo prompt with zero coverage`,
      description: `'${topVolumeMissed.text}' has 0% engine coverage. Highest-volume question your competitors own outright.`,
      cta: { label: "Fix in audit", href: "/audit" },
    });
  }
  if (biggestFaller && biggestFaller.coverageDelta < -2) {
    concerns.push({
      iconKey: "trend-down",
      title: `${biggestFaller.intent} declining (${biggestFaller.coverageDelta.toFixed(1)}%)`,
      description: `${biggestFaller.promptCount} ${biggestFaller.intent.toLowerCase()} prompts at ${biggestFaller.coveragePct}% coverage and dropping. Hardest gap to leave open another period.`,
      cta: { label: `View ${biggestFaller.intent.toLowerCase()}`, href: "/prompts" },
    });
  }
  if (weakestEngine && weakestEngine.hits < prompts.length * 0.6) {
    concerns.push({
      iconKey: "alert",
      title: `${engineLabels[weakestEngine.engine]} is your weakest engine`,
      description: `Missing on ${prompts.length - weakestEngine.hits} of ${prompts.length} tracked prompts. Every miss here is volume losing.`,
      cta: { label: "Engine breakdown", href: "/competitor-comparison" },
    });
  }
  while (concerns.length < 3) {
    concerns.push({
      iconKey: "alert",
      title: `${weakest?.intent ?? "Transactional"} is the soft spot`,
      description: `${weakest?.coveragePct ?? 0}% coverage on ${(weakest?.intent ?? "transactional").toLowerCase()} prompts. Money intent — close it next.`,
      cta: { label: "Fix in audit", href: "/audit" },
    });
  }

  // Page summary
  const pageSummaryGood = `You're winning at ${strongest?.intent.toLowerCase() ?? "branded"} prompts (${strongest?.coveragePct ?? brandedVisibility}% coverage),`;
  const pageSummaryFix = `but losing ${weakest?.intent.toLowerCase() ?? "transactional"} ones (${weakest?.coveragePct ?? unbrandedVisibility}%) — close that gap to capture revenue intent.`;
  const pageSummary = `${pageSummaryGood} ${pageSummaryFix}`;
  const promptsTableSummary = topVolumeMissed
    ? `Your highest-volume gap — '${topVolumeMissed.text}' (${(topVolumeMissed.volume / 1000).toFixed(1)}K/mo) — has zero engine coverage. Branded queries are landing (${brandedVisibility}%), but unbranded prompts are leaking. Capture answer-capsule formats first.`
    : `Branded queries landing at ${brandedVisibility}%. Unbranded coverage at ${unbrandedVisibility}% — biggest opportunity is closing the gap on the highest-volume unbranded prompts.`;

  // Next scan card
  const dayOfWeek = new Date().getDay();
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7;
  const nextScanDate = new Date();
  nextScanDate.setDate(nextScanDate.getDate() + daysUntilMonday);
  nextScanDate.setHours(9, 0, 0, 0);

  return {
    trendWord,
    trendDirection,
    promptsTracked: prompts.length,
    promptsTrackedDelta: rint(rng, 1, 5),
    promptsLanding: prompts.filter((p) => Object.values(p.engineHits).some(Boolean)).length,
    brandedVisibility,
    brandedVisibilityDelta: rfloat(rng, -4, 10, 1),
    brandedHits,
    brandedTotal,
    unbrandedVisibility,
    unbrandedVisibilityDelta: rfloat(rng, -6, 8, 1),
    unbrandedHits,
    unbrandedTotal,
    linkCitationRate,
    linkCitationDelta,
    linkCitationMentions,
    avgPositionWhenCited,
    avgPositionDelta: rfloat(rng, -0.6, 0.4, 1),
    avgPositionCompetitors: Math.max(2, competitors.length || 3),
    brandedTopRankCount,
    brandedTopRankTotal: branded.length,
    brandedTopRankFailEngines: brandedTopRankFailEngines as unknown as string[],
    brandedEngineHits,
    unbrandedEngineHits,
    prompts,
    intentCoverage,
    citationSources,
    sentimentByType,
    pageSummary,
    pageSummaryGood,
    pageSummaryFix,
    pageSummaryCta: { label: "Fix coverage gaps", href: "/audit" },
    promptsTableSummary,
    wins,
    concerns,
    nextScanDate,
    nextScanDays: daysUntilMonday,
    nextScanPromptCount: prompts.length,
  };
}
