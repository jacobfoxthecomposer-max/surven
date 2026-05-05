/**
 * Single source of truth for prompt categorization across Surven.
 *
 * Two layers:
 *   1. UNIVERSAL CATEGORIES — 6 hardcoded buckets every business uses.
 *      Powers PromptsSection ledger, IntentDistribution, TaxonomyCoverage,
 *      SentimentByFeature, and any other "by intent" surface.
 *   2. INDUSTRY CLUSTERS — per-vertical sub-topic dictionaries that power
 *      the Cluster Dominance card. Restaurants get menu/atmosphere/etc.;
 *      lawyers get personal injury/class actions/etc.
 *
 * Both are pure heuristic for now (keyword matching, no LLM). When we
 * persist `prompt_category` + `auto_clusters` to Supabase later, swap
 * these helpers' guts for `useQuery` reads — call sites stay unchanged.
 */

// ─── UNIVERSAL CATEGORIES (Tier 1) ─────────────────────────────────────────

export type PromptCategoryId =
  | "informational"
  | "local"
  | "comparison"
  | "use_case"
  | "transactional";

export interface PromptCategory {
  id: PromptCategoryId;
  label: string;
  color: string; // hex, on-brand
  description: string;
}

export const PROMPT_CATEGORIES: Record<PromptCategoryId, PromptCategory> = {
  informational: {
    id: "informational",
    label: "Informational",
    color: "#9B7EC8",
    description: 'Educational — "what is…", "how does it work", reviews, brand research.',
  },
  local: {
    id: "local",
    label: "Local",
    color: "#5BAF92",
    description: 'Geo-modified prompts — "near me", "in [city]", "[city] [category]".',
  },
  comparison: {
    id: "comparison",
    label: "Comparison",
    color: "#C97B45",
    description: 'Side-by-side vs. competitors — "X vs Y", "alternative to X", brand lookups.',
  },
  use_case: {
    id: "use_case",
    label: "Use-case",
    color: "#B8A030",
    description: 'Problem-framed — "how do I…", "what helps with…", "best for [job]".',
  },
  transactional: {
    id: "transactional",
    label: "Transactional",
    color: "#6BA3F5",
    description: 'Purchase/action intent — "book", "hire", "buy", "schedule", "get a quote".',
  },
};

export const PROMPT_CATEGORY_ORDER: PromptCategoryId[] = [
  "informational",
  "local",
  "comparison",
  "use_case",
  "transactional",
];

/**
 * Heuristic multi-intent classifier. Returns ALL of the 5 universal
 * categories that match the prompt text. Always returns at least one
 * intent (falls back to `informational` if nothing else matches).
 */
export function inferIntents(
  text: string,
  brandNames: string[] = [],
): PromptCategoryId[] {
  const t = text.toLowerCase();
  const brands = brandNames
    .filter(Boolean)
    .map((b) => b.toLowerCase().trim())
    .filter((b) => b.length >= 3);
  const out: PromptCategoryId[] = [];

  // Transactional — purchase / action intent
  if (
    /\b(book|hire|buy|purchase|schedule|get a quote|contact|call now|sign up|register|apply|order|free consultation)\b/.test(t)
  )
    out.push("transactional");

  // Comparison — vs, alternative, brand reviews/ratings, brand name lookup
  if (
    /\bvs\.?\b|\bversus\b|\bbetter than\b|\bcompared to\b|\balternative to\b|\balternatives to\b|\breview|\brating|\bis .* (good|legit|worth)\b/.test(t) ||
    brands.some((b) => t.includes(b))
  )
    out.push("comparison");

  // Local — near me / in [city, state] / in {known location placeholder}
  // Tightened: bare "in [word]" was matching things like "in a plumber" or
  // "in the morning". Now require an explicit geographic signal: "near me",
  // "nearby", "local", "in my/the area", or "in [city], [state-code]" with
  // the comma + 2-letter state to disambiguate from generic prepositions.
  if (
    /\bnear me\b|\blocal\b|\bin (my|the) area\b|\bnearby\b|\b(in|around|near) [a-z]+,\s+[a-z]{2}\b/.test(t)
  )
    out.push("local");

  // Use-case — problem-framing
  if (
    /\bhow (do|to|can|should) i\b|\bbest (for|to|way)\b|\btop \d+ (for|to)\b|\brecommended for\b|\bhelps? with\b|\bwhat (do|should) i\b/.test(t)
  )
    out.push("use_case");

  // Informational — definitional / educational
  if (
    /^(what is|what are|why does|why is|how does|how do|explain|definition of)\b/.test(t)
  )
    out.push("informational");

  if (out.length === 0) out.push("informational");
  return out;
}

/**
 * Single-intent picker — returns the first (highest-priority) intent.
 * Priority: transactional > comparison > local > use_case > informational.
 */
export function primaryIntent(
  text: string,
  brandNames: string[] = [],
): PromptCategoryId {
  return inferIntents(text, brandNames)[0] ?? "informational";
}

/**
 * Alias for primaryIntent — kept so existing call sites compile unchanged.
 */
export function categorizePrompt(
  text: string,
  brandNames: string[] = [],
): PromptCategoryId {
  return primaryIntent(text, brandNames);
}

// ─── INDUSTRY CLUSTERS (Tier 2) ────────────────────────────────────────────

interface ClusterDef {
  label: string;
  /** Lowercase substring keywords. First match wins. */
  keywords: string[];
}

/**
 * Per-industry sub-topic dictionaries. Each cluster has a label + a set
 * of lowercase keywords used to assign prompts. Order matters — earlier
 * clusters win ties.
 *
 * When we add LLM-generated `auto_clusters` per business, this becomes
 * the offline default; the LLM output overrides it once available.
 *
 * Industry keys must match the strings in `INDUSTRIES` (constants.ts).
 */
export const INDUSTRY_CLUSTERS: Record<string, ClusterDef[]> = {
  Lawyer: [
    { label: "Personal injury", keywords: ["personal injury", "accident", "injury claim", "slip and fall", "car accident"] },
    { label: "Class actions", keywords: ["class action", "class-action"] },
    { label: "Workers' comp", keywords: ["workers comp", "workers' comp", "workers' compensation", "work injury"] },
    { label: "Mass torts", keywords: ["mass tort", "product liability", "defective"] },
    { label: "Medical malpractice", keywords: ["medical malpractice", "malpractice", "doctor", "hospital", "misdiagnosis"] },
    { label: "Wrongful death", keywords: ["wrongful death", "fatal"] },
  ],
  Restaurant: [
    { label: "Menu items", keywords: ["menu", "dish", "specialty", "signature"] },
    { label: "Dietary restrictions", keywords: ["vegan", "gluten", "vegetarian", "dairy", "allergen", "kosher", "halal"] },
    { label: "Reservations", keywords: ["reservation", "book a table", "booking", "open table"] },
    { label: "Atmosphere", keywords: ["atmosphere", "ambience", "ambiance", "vibe", "decor", "romantic", "date night"] },
    { label: "Service quality", keywords: ["service", "staff", "wait time", "host"] },
    { label: "Pricing", keywords: ["price", "expensive", "cheap", "affordable", "budget", "fine dining"] },
  ],
  Plumber: [
    { label: "Emergency repair", keywords: ["emergency", "burst pipe", "leak", "urgent", "24 hour", "24/7"] },
    { label: "Installation", keywords: ["install", "new fixture", "replacement"] },
    { label: "Drain cleaning", keywords: ["drain", "clog", "blocked", "snake"] },
    { label: "Water heater", keywords: ["water heater", "tankless", "boiler", "hot water"] },
    { label: "Maintenance", keywords: ["maintenance", "tune up", "inspection", "annual"] },
    { label: "Pricing", keywords: ["price", "cost", "estimate", "quote", "free estimate"] },
  ],
  Dentist: [
    { label: "Cleanings", keywords: ["cleaning", "checkup", "hygienist"] },
    { label: "Cosmetic", keywords: ["whitening", "veneers", "cosmetic", "smile"] },
    { label: "Orthodontics", keywords: ["braces", "invisalign", "aligner", "orthodontic"] },
    { label: "Implants", keywords: ["implant", "crown", "bridge"] },
    { label: "Emergency dental", keywords: ["emergency", "tooth pain", "broken", "abscess"] },
    { label: "Insurance & pricing", keywords: ["insurance", "price", "cost", "payment plan", "affordable"] },
  ],
  "Marketing Agency": [
    { label: "SEO", keywords: ["seo", "search engine optimization", "rankings"] },
    { label: "Paid ads", keywords: ["ppc", "google ads", "facebook ads", "paid advertising", "media buying"] },
    { label: "Content", keywords: ["content marketing", "blog", "copywriting"] },
    { label: "Social media", keywords: ["social media", "instagram", "tiktok", "linkedin"] },
    { label: "Email marketing", keywords: ["email marketing", "newsletter", "drip"] },
    { label: "Branding", keywords: ["branding", "rebrand", "identity", "logo"] },
  ],
  "Real Estate Agent": [
    { label: "Buying", keywords: ["buy", "buyer", "first time buyer", "starter home"] },
    { label: "Selling", keywords: ["sell", "selling", "list my house", "list my home"] },
    { label: "Luxury", keywords: ["luxury", "high end", "estate", "mansion"] },
    { label: "Investment", keywords: ["investment", "rental", "investor", "fix and flip"] },
    { label: "Commercial", keywords: ["commercial", "office space", "retail space"] },
    { label: "Neighborhoods", keywords: ["neighborhood", "schools", "best area", "moving to"] },
  ],
  "Auto Mechanic": [
    { label: "Engine repair", keywords: ["engine", "check engine", "misfire"] },
    { label: "Brakes", keywords: ["brake", "rotor", "pad"] },
    { label: "Oil change", keywords: ["oil change", "synthetic oil"] },
    { label: "Transmission", keywords: ["transmission", "shifting", "clutch"] },
    { label: "Diagnostics", keywords: ["diagnostic", "obd", "scanner"] },
    { label: "Pricing", keywords: ["price", "cost", "estimate", "labor rate"] },
  ],
  Salon: [
    { label: "Haircuts", keywords: ["haircut", "trim", "barber"] },
    { label: "Color", keywords: ["color", "highlights", "balayage", "ombre", "dye"] },
    { label: "Bridal", keywords: ["bridal", "wedding", "updo"] },
    { label: "Extensions", keywords: ["extension", "weave", "wig"] },
    { label: "Treatments", keywords: ["treatment", "keratin", "smoothing", "deep condition"] },
    { label: "Pricing", keywords: ["price", "cost", "stylist rate"] },
  ],
  Gym: [
    { label: "Personal training", keywords: ["personal trainer", "1-on-1", "training session"] },
    { label: "Group classes", keywords: ["group class", "yoga", "spin", "pilates", "crossfit"] },
    { label: "Equipment", keywords: ["equipment", "machines", "free weights", "squat rack"] },
    { label: "Membership pricing", keywords: ["membership", "monthly", "join", "sign up", "annual"] },
    { label: "Hours & access", keywords: ["hours", "24 hour", "open", "access"] },
    { label: "Amenities", keywords: ["sauna", "pool", "shower", "locker", "childcare"] },
  ],
};

/**
 * Sample prompts per industry × cluster — used by the Personalized Prompt
 * Themes view on /prompts to populate each theme with realistic-looking
 * questions until real per-cluster prompts get added by the user. These
 * never get sent to /api/scan; they're display-only mock data.
 *
 * Keys: industry → cluster label → array of prompt texts.
 * `{location}` and `{state}` get replaced at render time with the
 * business's actual city/state from `useActiveBusiness`.
 */
export const INDUSTRY_SAMPLE_PROMPTS: Record<
  string,
  Record<string, string[]>
> = {
  Lawyer: {
    "Personal injury": [
      "Best personal injury lawyer in {location}",
      "How much does a personal injury attorney cost in {location}?",
      "Personal injury lawyer free consultation {location}",
      "Top rated personal injury attorneys near me",
      "Average settlement for car accident injury in {state}",
      "Best slip and fall lawyer in {location}",
    ],
    "Class actions": [
      "Best class action attorneys in {state}",
      "How do I join a class action lawsuit in {location}?",
      "Class action lawyer no upfront cost",
      "Recent class action settlements in {state}",
      "Top class action law firms for consumers in {location}",
    ],
    "Workers' comp": [
      "Best workers comp lawyer in {location}",
      "How long does a workers comp claim take in {state}?",
      "Workers compensation attorney free consultation {location}",
      "Workers comp denied — what do I do in {state}?",
      "Top rated workers comp attorneys near me",
      "Average workers comp settlement in {state}",
    ],
    "Mass torts": [
      "Best mass tort attorneys in {state}",
      "Defective product lawyer {location}",
      "Pharmaceutical injury law firm in {state}",
      "Roundup lawsuit attorney in {location}",
      "Camp Lejeune water contamination lawyer",
    ],
    "Medical malpractice": [
      "Best medical malpractice lawyer in {location}",
      "How to sue a hospital for malpractice in {state}",
      "Misdiagnosis attorney {location}",
      "Birth injury lawyer near me",
      "Top medical malpractice law firms in {state}",
      "Average medical malpractice settlement {state}",
    ],
    "Wrongful death": [
      "Wrongful death attorney in {location}",
      "Average wrongful death settlement in {state}",
      "Best wrongful death law firm {location}",
      "How to file a wrongful death lawsuit in {state}",
      "Wrongful death lawyer free consultation",
    ],
  },
  Restaurant: {
    "Menu items": [
      "Best burgers in {location}",
      "Top brunch spots in {location}",
      "Most popular signature dishes at restaurants in {location}",
    ],
    "Dietary restrictions": [
      "Best vegan restaurants in {location}",
      "Gluten-free dining {location}",
      "Halal restaurants near me",
    ],
    Reservations: [
      "How to book a table at popular restaurants in {location}",
      "Best restaurants for last-minute reservations {location}",
    ],
    Atmosphere: [
      "Most romantic restaurants in {location}",
      "Best date-night spots in {location}",
      "Restaurants with outdoor seating in {location}",
    ],
    "Service quality": [
      "Best service restaurants in {location}",
      "Top fine-dining experience in {location}",
    ],
    Pricing: [
      "Best affordable restaurants in {location}",
      "Cheap eats {location}",
      "Best fine dining in {location}",
    ],
  },
  Plumber: {
    "Emergency repair": [
      "24-hour emergency plumber in {location}",
      "Burst pipe repair {location}",
      "Same-day plumber near me",
    ],
    Installation: [
      "New water heater installation cost in {location}",
      "Best plumber for fixture installation in {location}",
    ],
    "Drain cleaning": [
      "Drain cleaning service in {location}",
      "Best plumber for clogged sewer line {location}",
    ],
    "Water heater": [
      "Tankless water heater installation in {location}",
      "Water heater repair cost in {location}",
    ],
    Maintenance: [
      "Annual plumbing inspection {location}",
      "Best plumber for maintenance plans in {location}",
    ],
    Pricing: [
      "Average cost of a plumber in {location}",
      "Free plumbing estimate {location}",
    ],
  },
};

/**
 * Generic fallback clusters for industries we don't have a dictionary for.
 */
const GENERIC_CLUSTERS: ClusterDef[] = [
  { label: "Pricing", keywords: ["price", "cost", "expensive", "cheap", "affordable", "budget"] },
  { label: "Quality", keywords: ["quality", "best", "top rated", "premium", "high end"] },
  { label: "Reviews", keywords: ["review", "rating", "rated", "testimonial"] },
  { label: "Location", keywords: ["near me", "local", "in [a-z]+", "nearby"] },
  { label: "Service", keywords: ["service", "support", "customer", "help"] },
  { label: "Comparisons", keywords: ["vs", "versus", "alternative", "compared", "or better"] },
];

export function clustersForIndustry(industry: string | undefined | null): ClusterDef[] {
  if (!industry) return GENERIC_CLUSTERS;
  return INDUSTRY_CLUSTERS[industry] ?? GENERIC_CLUSTERS;
}

/**
 * Assign a prompt to its best-matching cluster for the given industry.
 * Returns the cluster label, or "Other" when no keywords hit.
 */
export function clusterForPrompt(
  text: string,
  industry: string | undefined | null,
): string {
  const t = text.toLowerCase();
  const defs = clustersForIndustry(industry);
  for (const def of defs) {
    if (def.keywords.some((k) => t.includes(k))) return def.label;
  }
  return "Other";
}
