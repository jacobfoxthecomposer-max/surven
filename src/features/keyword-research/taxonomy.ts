import type { TaxonomyCategory, IntentType } from "./types";

export const TAXONOMY_LABEL: Record<TaxonomyCategory, string> = {
  branded_defensive: "Branded — defensive",
  branded_informational: "Branded — informational",
  category: "Category core",
  category_informational: "Category — informational",
  comparative: "Comparative",
  use_case_jtbd: "Use-case / JTBD",
  audience_modified: "Audience-modified",
  constraint_modified: "Constraint-modified",
  list_recommendation: "List / recommendation",
  validation: "Validation",
  operational: "Operational",
  adjacent: "Adjacent",
  negative_objection: "Negative / objection",
};

export const TAXONOMY_DESCRIPTION: Record<TaxonomyCategory, string> = {
  branded_defensive: "Prompts that name your brand directly — reviews, pricing, alternatives.",
  branded_informational: "Branded prompts asking what you do or who founded you.",
  category: "Unbranded prompts in your category. Where growth lives.",
  category_informational: "Educational prompts about your category.",
  comparative: "Side-by-side prompts vs. competitors.",
  use_case_jtbd: "Problem-framed prompts. Highest commercial intent.",
  audience_modified: "Prompts with a specific audience attached.",
  constraint_modified: "Prompts filtered by price, region, integration.",
  list_recommendation: "Prompts asking for a ranked list.",
  validation: "Trust prompts — 'is X legit', reviews, scam.",
  operational: "How-to prompts about using your product.",
  adjacent: "Nearby categories where your brand could plausibly surface.",
  negative_objection: "Bear-case prompts. Early reputation warnings.",
};

export const TAXONOMY_COLOR: Record<TaxonomyCategory, string> = {
  branded_defensive: "#96A283",
  branded_informational: "#7D8E6C",
  category: "#6BA3F5",
  category_informational: "#7A8FA6",
  comparative: "#C97B45",
  use_case_jtbd: "#B8A030",
  audience_modified: "#9B7EC8",
  constraint_modified: "#A07878",
  list_recommendation: "#5BAF92",
  validation: "#B54631",
  operational: "#566A47",
  adjacent: "#D4943A",
  negative_objection: "#8C3522",
};

export const TAXONOMY_ORDER: TaxonomyCategory[] = [
  "branded_defensive",
  "branded_informational",
  "category",
  "category_informational",
  "comparative",
  "use_case_jtbd",
  "audience_modified",
  "constraint_modified",
  "list_recommendation",
  "validation",
  "operational",
  "adjacent",
  "negative_objection",
];

export const INTENT_LABEL: Record<IntentType, string> = {
  informational: "Informational",
  navigational: "Navigational",
  transactional: "Transactional",
  commercial: "Commercial",
  local: "Local",
  validation: "Validation",
  operational: "Operational",
};

export const INTENT_COLOR: Record<IntentType, string> = {
  informational: "#6BA3F5",
  navigational: "#7A8FA6",
  transactional: "#C97B45",
  commercial: "#96A283",
  local: "#B8A030",
  validation: "#B54631",
  operational: "#566A47",
};

export const INTENT_ORDER: IntentType[] = [
  "commercial",
  "informational",
  "validation",
  "operational",
  "transactional",
  "local",
  "navigational",
];

export const TAXONOMY_TO_INTENT: Record<TaxonomyCategory, IntentType> = {
  branded_defensive: "validation",
  branded_informational: "informational",
  category: "commercial",
  category_informational: "informational",
  comparative: "commercial",
  use_case_jtbd: "commercial",
  audience_modified: "commercial",
  constraint_modified: "commercial",
  list_recommendation: "commercial",
  validation: "validation",
  operational: "operational",
  adjacent: "commercial",
  negative_objection: "validation",
};
