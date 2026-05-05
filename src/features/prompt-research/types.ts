export type TaxonomyCategory =
  | "branded_defensive"
  | "branded_informational"
  | "category"
  | "category_informational"
  | "comparative"
  | "use_case_jtbd"
  | "audience_modified"
  | "constraint_modified"
  | "list_recommendation"
  | "validation"
  | "operational"
  | "adjacent"
  | "negative_objection";

export type IntentType =
  | "informational"
  | "local"
  | "comparison"
  | "use_case"
  | "transactional";

export type EngineId = "chatgpt" | "claude" | "gemini" | "google_ai";

export interface Variant {
  id: string;
  text: string;
  coverage: Record<EngineId, number>;
}

export interface Intent {
  id: string;
  canonical: string;
  taxonomy: TaxonomyCategory;
  intentType: IntentType;
  cluster: string;
  importance: number;
  variants: Variant[];
  overallCoverage: number;
  inTracker: boolean;
}

export interface EntityGridData {
  brand: string;
  competitors: string[];
  adjacent: string[];
  audience: string[];
}

export interface PromptResearchData {
  entityGrid: EntityGridData;
  intents: Intent[];
}
