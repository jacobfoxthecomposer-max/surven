import type {
  Intent,
  Variant,
  TaxonomyCategory,
  EngineId,
  PromptResearchData,
  EntityGridData,
} from "./types";
import { TAXONOMY_TO_INTENT } from "./taxonomy";

const ENGINES: EngineId[] = ["chatgpt", "claude", "gemini", "google_ai"];

// ─── Deterministic PRNG seeded from business id ─────────────────────────────
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

// ─── Adjacent + audience templates by industry ──────────────────────────────
const INDUSTRY_ADJACENT: Record<string, string[]> = {
  Plumber: ["HVAC", "Water heater install", "Drain cleaning", "Septic service", "Pipe insulation"],
  Restaurant: ["Catering", "Food delivery", "Event venue", "Private chef", "Meal prep"],
  Dentist: ["Orthodontist", "Oral surgeon", "Cosmetic dentistry", "Dental hygienist", "Teeth whitening"],
  "Marketing Agency": ["SEO agency", "PPC management", "Social media agency", "Branding studio", "Content marketing"],
  "Real Estate Agent": ["Mortgage broker", "Home inspector", "Property manager", "Title company", "Real estate photographer"],
  Lawyer: ["Paralegal services", "Notary public", "Mediator", "Legal aid", "Court reporter"],
  "Auto Mechanic": ["Body shop", "Tire shop", "Auto detail", "Oil change", "Towing"],
  Salon: ["Barber", "Nail salon", "Spa", "Lash extensions", "Tanning"],
  Gym: ["Personal trainer", "Yoga studio", "Pilates", "CrossFit", "Sports massage"],
  Accountant: ["Bookkeeper", "Tax preparer", "Financial advisor", "Payroll service", "Auditor"],
  Chiropractor: ["Massage therapist", "Physical therapist", "Acupuncturist", "Sports medicine", "Wellness coach"],
  "Insurance Agent": ["Financial advisor", "Mortgage broker", "Estate attorney", "Tax preparer", "Retirement planner"],
  Photographer: ["Videographer", "Wedding planner", "Photo printing", "Studio rental", "Photo editor"],
  Veterinarian: ["Pet groomer", "Pet boarding", "Pet trainer", "Animal hospital", "Mobile vet"],
  "Financial Advisor": ["Tax preparer", "Estate attorney", "Insurance agent", "Retirement planner", "Investment broker"],
  "Home Inspector": ["Real estate agent", "Mortgage broker", "Pest control", "Mold remediation", "Radon tester"],
  "HVAC Technician": ["Plumber", "Electrician", "Insulation installer", "Duct cleaning", "Solar installer"],
  Landscaper: ["Lawn care", "Tree service", "Pool service", "Hardscaping", "Irrigation"],
  "Personal Trainer": ["Nutritionist", "Yoga instructor", "Massage therapist", "Wellness coach", "Sports physio"],
  Therapist: ["Psychiatrist", "Life coach", "Couples counselor", "Group therapy", "Wellness retreat"],
};

const INDUSTRY_AUDIENCE: Record<string, string[]> = {
  Plumber: ["homeowners", "property managers", "restaurants", "small businesses", "landlords"],
  Restaurant: ["families", "couples", "groups", "tourists", "business diners"],
  Dentist: ["families", "kids", "seniors", "professionals", "anxious patients"],
  "Marketing Agency": ["startups", "B2B SaaS", "ecommerce brands", "local businesses", "nonprofits"],
  "Real Estate Agent": ["first-time buyers", "investors", "luxury buyers", "downsizers", "relocators"],
  Lawyer: ["small businesses", "startups", "families", "individuals", "estates"],
  "Auto Mechanic": ["everyday drivers", "fleet owners", "luxury car owners", "DIY mechanics", "EV owners"],
  Salon: ["brides", "men", "kids", "professionals", "color clients"],
  Gym: ["beginners", "athletes", "seniors", "couples", "busy professionals"],
  Accountant: ["small businesses", "freelancers", "startups", "real estate investors", "high earners"],
  Chiropractor: ["athletes", "office workers", "seniors", "post-injury patients", "pregnant women"],
  "Insurance Agent": ["families", "small business owners", "homeowners", "drivers", "renters"],
  Photographer: ["weddings", "newborns", "headshots", "events", "real estate"],
  Veterinarian: ["dog owners", "cat owners", "exotic pets", "senior pets", "puppies"],
  "Financial Advisor": ["high earners", "retirees", "young professionals", "business owners", "couples"],
  "Home Inspector": ["first-time buyers", "investors", "sellers", "lenders", "agents"],
  "HVAC Technician": ["homeowners", "landlords", "small businesses", "new construction", "commercial"],
  Landscaper: ["homeowners", "HOAs", "businesses", "property managers", "estates"],
  "Personal Trainer": ["beginners", "moms", "weight loss clients", "athletes", "post-rehab"],
  Therapist: ["anxious adults", "couples", "teens", "first responders", "veterans"],
};

const DEFAULT_ADJACENT = ["Local services", "Online directories", "Customer review sites", "Industry associations", "Trade publications"];
const DEFAULT_AUDIENCE = ["small businesses", "homeowners", "professionals", "families", "startups"];

// ─── Variant phrasing seeds ─────────────────────────────────────────────────
const POLITE = ["", "what's the ", "tell me the ", "could you suggest a ", "I need a ", "help me find a "];
const CONVERSATIONAL = ["yo who's a good ", "anyone know a good ", "looking for a "];
const FORMAL = ["recommend a ", "please suggest a ", "I'm researching "];

function seedVariants(base: string, count: number, rng: () => number): string[] {
  const out = new Set<string>([base]);
  const styles = [...POLITE, ...CONVERSATIONAL, ...FORMAL];
  while (out.size < count) {
    const prefix = styles[Math.floor(rng() * styles.length)];
    const variant = (prefix + base).replace(/\s+/g, " ").trim().toLowerCase();
    out.add(variant);
    if (out.size > 200) break; // safety
  }
  return Array.from(out).slice(0, count);
}

// ─── Prompt templates per taxonomy ──────────────────────────────────────────
function buildTemplates(brand: string, category: string, city: string, competitors: string[], adjacent: string[], audience: string[]) {
  const cat = category.toLowerCase();
  const cityCat = city ? `${cat} in ${city}` : cat;
  const comps = competitors.length > 0 ? competitors : ["a competitor"];
  const aud = audience.length > 0 ? audience : DEFAULT_AUDIENCE;

  return {
    branded_defensive: [
      `${brand} reviews`,
      `${brand} pricing`,
      `is ${brand} legit`,
      `alternatives to ${brand}`,
      `${brand} vs ${comps[0]}`,
      `${brand} complaints`,
    ],
    branded_informational: [
      `what does ${brand} do`,
      `who founded ${brand}`,
      `${brand} services`,
      `how does ${brand} work`,
    ],
    category: [
      `best ${cityCat}`,
      `top ${cat} services`,
      `recommended ${cityCat}`,
      `affordable ${cityCat}`,
      `${cityCat} near me`,
    ],
    category_informational: [
      `what is a ${cat}`,
      `how do I choose a ${cat}`,
      `what should I look for in a ${cat}`,
      `do I need a ${cat}`,
    ],
    comparative: comps.slice(0, 4).flatMap((c) => [
      `${brand} vs ${c}`,
      `${c} or ${brand}`,
    ]),
    use_case_jtbd: [
      `my pipes are leaking what should I do`.replace("pipes", `${cat} issue`),
      `how do I find a reliable ${cat}`,
      `I need a ${cat} fast`,
      `who can help with a ${cat} emergency`,
    ],
    audience_modified: aud.slice(0, 4).map((a) => `best ${cat} for ${a}`),
    constraint_modified: [
      `affordable ${cityCat}`,
      `cheapest ${cat} near me`,
      `24/7 ${cityCat}`,
      `licensed ${cityCat}`,
    ],
    list_recommendation: [
      `top 5 ${cityCat}`,
      `best 10 ${cat} services`,
      `list of ${cityCat}`,
    ],
    validation: [
      `is ${brand} a scam`,
      `can I trust ${brand}`,
      `${brand} bad reviews`,
      `${cat} scams to avoid`,
    ],
    operational: [
      `how do I book ${brand}`,
      `how do I contact ${brand}`,
      `does ${brand} offer same-day service`,
      `${brand} hours`,
    ],
    adjacent: adjacent.slice(0, 5).map((a) => `best ${a.toLowerCase()} ${city ? `in ${city}` : ""}`.trim()),
    negative_objection: [
      `why ${cat} services are expensive`,
      `problems with ${brand}`,
      `${cat} ripoffs`,
    ],
  } satisfies Record<TaxonomyCategory, string[]>;
}

export function generatePromptResearchData(
  businessId: string,
  businessName: string,
  industry: string,
  city: string,
  competitors: { name: string }[]
): PromptResearchData {
  const seed = hashSeed(businessId || businessName);
  const rng = mulberry(seed);

  const adjacent = INDUSTRY_ADJACENT[industry] ?? DEFAULT_ADJACENT;
  const audience = INDUSTRY_AUDIENCE[industry] ?? DEFAULT_AUDIENCE;
  const competitorNames = competitors.map((c) => c.name);

  const entityGrid: EntityGridData = {
    brand: businessName,
    competitors: competitorNames.slice(0, 5),
    adjacent: adjacent.slice(0, 5),
    audience: audience.slice(0, 5),
  };

  const templates = buildTemplates(businessName, industry, city, competitorNames, adjacent, audience);

  const intents: Intent[] = [];
  let intentIdCounter = 0;

  for (const [taxonomyKey, prompts] of Object.entries(templates)) {
    const taxonomy = taxonomyKey as TaxonomyCategory;
    const intentType = TAXONOMY_TO_INTENT[taxonomy];

    for (const canonical of prompts) {
      const id = `intent-${intentIdCounter++}`;

      const variantCount = 5 + Math.floor(rng() * 7);
      const variantTexts = seedVariants(canonical, variantCount, rng);

      const variants: Variant[] = variantTexts.map((text, i) => {
        const coverage: Record<EngineId, number> = {} as Record<EngineId, number>;
        for (const engine of ENGINES) {
          coverage[engine] = Math.round(rng() * 100);
        }
        return { id: `${id}-v${i}`, text, coverage };
      });

      const overallCoverage = Math.round(
        variants.reduce(
          (acc, v) => acc + ENGINES.reduce((s, e) => s + v.coverage[e], 0) / ENGINES.length,
          0
        ) / variants.length
      );

      const importance = 30 + Math.floor(rng() * 70);

      intents.push({
        id,
        canonical,
        taxonomy,
        intentType,
        cluster: humanCluster(taxonomy),
        importance,
        variants,
        overallCoverage,
        inTracker: rng() < 0.35,
      });
    }
  }

  return { entityGrid, intents };
}

function humanCluster(t: TaxonomyCategory): string {
  return ({
    branded_defensive: "Brand defense",
    branded_informational: "Brand explainer",
    category: "Category core",
    category_informational: "Category education",
    comparative: "Head-to-head",
    use_case_jtbd: "Problem-framed",
    audience_modified: "Audience-specific",
    constraint_modified: "Filtered by constraint",
    list_recommendation: "Listicles",
    validation: "Trust check",
    operational: "How-to",
    adjacent: "Adjacent territory",
    negative_objection: "Bear case",
  } as Record<TaxonomyCategory, string>)[t];
}
