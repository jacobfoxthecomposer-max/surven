export type QuoteTier = "high" | "mid" | "low";

export interface QuoteSignal {
  key: string;
  label: string;
  detail: string;
  delta: number;
  positive: boolean;
}

export interface QuoteScore {
  score: number;
  tier: QuoteTier;
  signals: QuoteSignal[];
  topReason: string;
}

export const TIER_LABELS: Record<QuoteTier, string> = {
  high: "AI will likely quote this",
  mid: "Maybe quotable — has gaps",
  low: "AI will probably skip this",
};

export const TIER_DESCRIPTIONS: Record<QuoteTier, string> = {
  high: "Strong, citable content. AI engines look for exactly this kind of text — specific, well-structured, and easy to extract.",
  mid: "Some signals are strong but key elements are missing. A small rewrite could push this into 'high' territory.",
  low: "AI will skip this when answering questions. Likely too vague, too long, too short, or full of hedge words / marketing fluff.",
};

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
    return {
      score: 0,
      tier: "low",
      signals: [{ key: "too-short", label: "Too short", detail: "Under 20 characters — not enough content for AI to cite.", delta: -50, positive: false }],
      topReason: "Too short to score",
    };
  }

  const signals: QuoteSignal[] = [];

  if (len >= 80 && len <= 300) {
    signals.push({ key: "length-ideal", label: "Ideal length", detail: `${len} chars — sits in the 80–300 sweet spot AI prefers to quote.`, delta: 12, positive: true });
  } else if (len < 40) {
    signals.push({ key: "too-short", label: "Too short", detail: `Only ${len} chars — AI usually skips fragments under 40 characters.`, delta: -15, positive: false });
  } else if (len > 600) {
    signals.push({ key: "too-long", label: "Too long", detail: `${len} chars — AI truncates long blocks and may miss your point.`, delta: -10, positive: false });
  } else if (len > 300) {
    signals.push({ key: "length-ok", label: "Acceptable length", detail: `${len} chars — quotable but on the longer side.`, delta: 4, positive: true });
  } else {
    signals.push({ key: "length-short", label: "On the short side", detail: `${len} chars — workable but not ideal. Aim for 80–300.`, delta: 0, positive: true });
  }

  const entityResult = scoreEntityDensity(cleaned);
  if (entityResult.score >= 12) {
    signals.push({ key: "entity-strong", label: "Rich in specifics", detail: `Found ${entityResult.count} entities (names, numbers, dates) — AI loves concrete data.`, delta: entityResult.score, positive: true });
  } else if (entityResult.score >= 6) {
    signals.push({ key: "entity-mid", label: "Some specifics", detail: `Found ${entityResult.count} entities. More proper nouns, numbers, or dates would help.`, delta: entityResult.score, positive: true });
  } else {
    signals.push({ key: "entity-weak", label: "Few specifics", detail: "No proper nouns, numbers, or dates. AI struggles to cite vague text.", delta: 0, positive: false });
  }

  let structureMatched = false;
  for (const pattern of ANSWER_STARTERS) {
    if (pattern.test(cleaned)) {
      signals.push({ key: "structure-answer", label: "Answer-shaped", detail: "Starts with a pattern AI recognizes as a direct answer (what / how / X is / step 1).", delta: 12, positive: true });
      structureMatched = true;
      break;
    }
  }
  if (!structureMatched) {
    signals.push({ key: "structure-weak", label: "Not answer-shaped", detail: "Doesn't start like an answer. AI prefers sentences that lead with the answer up front.", delta: 0, positive: false });
  }

  if (ctx.hasSchema) {
    signals.push({ key: "schema-present", label: "Wrapped in schema", detail: "This block is inside FAQPage / Article / HowTo / Recipe schema. Big boost — AI trusts structured data.", delta: 15, positive: true });
  }

  if (ctx.hasLinks) {
    signals.push({ key: "has-links", label: "Has citation links", detail: "Contains links to external sources. AI rewards content that cites authoritative domains.", delta: 5, positive: true });
  }

  const lower = cleaned.toLowerCase();
  const hedges: string[] = [];
  for (const hedge of HEDGE_WORDS) {
    if (lower.includes(hedge)) hedges.push(hedge);
  }
  if (hedges.length > 0) {
    const penalty = -Math.min(hedges.length * 6, 18);
    signals.push({ key: "hedge-words", label: "Hedge words found", detail: `Contains "${hedges.slice(0, 2).join('", "')}" — AI avoids quoting wishy-washy text.`, delta: penalty, positive: false });
  }

  const fluffs: string[] = [];
  for (const phrase of FLUFF_PHRASES) {
    if (lower.includes(phrase)) fluffs.push(phrase);
  }
  if (fluffs.length > 0) {
    const penalty = -Math.min(fluffs.length * 8, 24);
    signals.push({ key: "fluff", label: "Marketing fluff", detail: `Contains "${fluffs[0]}" and similar buzzwords. AI treats this as unhelpful filler.`, delta: penalty, positive: false });
  }

  if (cleaned.length > 30 && cleaned === cleaned.toUpperCase()) {
    signals.push({ key: "all-caps", label: "ALL CAPS", detail: "Reads like shouting. AI deprioritizes all-caps content.", delta: -10, positive: false });
  }

  const totalDelta = signals.reduce((sum, s) => sum + s.delta, 0);
  const score = Math.max(0, Math.min(100, Math.round(50 + totalDelta)));
  const tier: QuoteTier = score >= 70 ? "high" : score >= 40 ? "mid" : "low";

  const topReason = pickTopReason(signals, tier);

  return { score, tier, signals, topReason };
}

function pickTopReason(signals: QuoteSignal[], tier: QuoteTier): string {
  if (tier === "low") {
    const negatives = signals.filter((s) => !s.positive && s.delta < 0).sort((a, b) => a.delta - b.delta);
    return negatives[0]?.label ?? "Multiple weak signals";
  }
  if (tier === "high") {
    const positives = signals.filter((s) => s.positive && s.delta > 0).sort((a, b) => b.delta - a.delta);
    return positives[0]?.label ?? "Strong signals across the board";
  }
  return "Mix of strong and weak signals";
}

function scoreEntityDensity(text: string): { score: number; count: number } {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return { score: 0, count: 0 };

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
  return { score: Math.min(Math.round(density * 4), 20), count: Math.round(entityCount) };
}

export const TIER_TINTS: Record<QuoteTier, string> = {
  high: "rgba(150, 162, 131, 0.38)",
  mid: "rgba(212, 169, 90, 0.36)",
  low: "rgba(181, 70, 49, 0.30)",
};

export const TIER_BORDERS: Record<QuoteTier, string> = {
  high: "rgba(107, 122, 89, 0.95)",
  mid: "rgba(170, 130, 60, 0.95)",
  low: "rgba(140, 50, 35, 0.85)",
};

export const TIER_GLOWS: Record<QuoteTier, string> = {
  high: "rgba(107, 122, 89, 0.35)",
  mid: "rgba(170, 130, 60, 0.35)",
  low: "rgba(140, 50, 35, 0.30)",
};
