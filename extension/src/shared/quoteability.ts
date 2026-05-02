export type QuoteTier = "high" | "mid" | "low";

export interface QuoteScore {
  score: number;
  tier: QuoteTier;
  signals: {
    lengthBonus: number;
    entityBonus: number;
    structureBonus: number;
    schemaBonus: number;
    citationBonus: number;
    hedgePenalty: number;
    fluffPenalty: number;
  };
}

const HEDGE_WORDS = [
  "maybe", "perhaps", "possibly", "might", "could be", "may be",
  "we think", "we believe", "we feel", "in our opinion",
  "kind of", "sort of", "somewhat", "arguably",
];

const FLUFF_PHRASES = [
  "world-class", "best-in-class", "cutting-edge", "industry-leading",
  "synergy", "leverage", "paradigm", "ecosystem", "robust solution",
  "next-generation", "revolutionary", "game-changing", "innovative solutions",
  "passionate about", "dedicated to excellence", "unparalleled",
];

const ANSWER_STARTERS = [
  /^(what|how|why|when|where|who|which)\b/i,
  /^[a-z][a-z\s]{2,30}\s+(is|are|means|refers to|includes|consists of|requires)\b/i,
  /^(to\s+\w+|first|second|third|step \d|\d+\.)\b/i,
  /^(the\s+\w+|a\s+\w+)\s+(is|are|consists|includes|provides)\b/i,
];

export function scoreQuoteability(text: string, ctx: { hasSchema?: boolean; hasLinks?: boolean } = {}): QuoteScore {
  const cleaned = text.trim();
  const len = cleaned.length;

  if (len < 20) {
    return zeroScore("low");
  }

  let score = 50;
  const signals = {
    lengthBonus: 0,
    entityBonus: 0,
    structureBonus: 0,
    schemaBonus: 0,
    citationBonus: 0,
    hedgePenalty: 0,
    fluffPenalty: 0,
  };

  if (len >= 80 && len <= 300) {
    signals.lengthBonus = 12;
  } else if (len < 40) {
    signals.lengthBonus = -15;
  } else if (len > 600) {
    signals.lengthBonus = -10;
  } else if (len > 300 && len <= 600) {
    signals.lengthBonus = 4;
  }

  signals.entityBonus = scoreEntityDensity(cleaned);

  for (const pattern of ANSWER_STARTERS) {
    if (pattern.test(cleaned)) {
      signals.structureBonus = 12;
      break;
    }
  }

  if (ctx.hasSchema) signals.schemaBonus = 15;
  if (ctx.hasLinks) signals.citationBonus = 5;

  const lower = cleaned.toLowerCase();
  let hedgeCount = 0;
  for (const hedge of HEDGE_WORDS) {
    if (lower.includes(hedge)) hedgeCount++;
  }
  signals.hedgePenalty = -Math.min(hedgeCount * 6, 18);

  let fluffCount = 0;
  for (const phrase of FLUFF_PHRASES) {
    if (lower.includes(phrase)) fluffCount++;
  }
  signals.fluffPenalty = -Math.min(fluffCount * 8, 24);

  if (cleaned.length > 30 && cleaned === cleaned.toUpperCase()) {
    signals.fluffPenalty -= 10;
  }

  score +=
    signals.lengthBonus +
    signals.entityBonus +
    signals.structureBonus +
    signals.schemaBonus +
    signals.citationBonus +
    signals.hedgePenalty +
    signals.fluffPenalty;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    tier: score >= 70 ? "high" : score >= 40 ? "mid" : "low",
    signals,
  };
}

function scoreEntityDensity(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  let entityCount = 0;

  const properNounMatches = text.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*\b/g) ?? [];
  entityCount += properNounMatches.filter((m) => !["The", "This", "That", "These", "Those", "But", "And", "Or"].includes(m)).length;

  const numberMatches = text.match(/\b\d{1,4}(?:[,.]\d+)?(?:%|st|nd|rd|th)?\b/g) ?? [];
  entityCount += numberMatches.length * 1.5;

  const yearMatches = text.match(/\b(19|20)\d{2}\b/g) ?? [];
  entityCount += yearMatches.length * 2;

  const dollarMatches = text.match(/\$\d+/g) ?? [];
  entityCount += dollarMatches.length * 2;

  const density = entityCount / Math.max(words.length / 10, 1);
  return Math.min(Math.round(density * 4), 20);
}

function zeroScore(tier: QuoteTier): QuoteScore {
  return {
    score: 0,
    tier,
    signals: {
      lengthBonus: 0,
      entityBonus: 0,
      structureBonus: 0,
      schemaBonus: 0,
      citationBonus: 0,
      hedgePenalty: 0,
      fluffPenalty: 0,
    },
  };
}

export const TIER_TINTS: Record<QuoteTier, string> = {
  high: "rgba(150, 162, 131, 0.28)",
  mid: "rgba(212, 169, 90, 0.28)",
  low: "rgba(181, 70, 49, 0.22)",
};

export const TIER_BORDERS: Record<QuoteTier, string> = {
  high: "rgba(107, 122, 89, 0.6)",
  mid: "rgba(170, 130, 60, 0.6)",
  low: "rgba(140, 50, 35, 0.5)",
};
