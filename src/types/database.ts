export interface Business {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  city: string;
  state: string;
  created_at: string;
}

export interface Competitor {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
}

export interface SearchPrompt {
  id: string;
  business_id: string;
  prompt_text: string;
  active: boolean;
  created_at: string;
}

export interface Scan {
  id: string;
  business_id: string;
  visibility_score: number;
  scan_type: "manual" | "automated";
  model_scores: Record<string, number> | null;
  created_at: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  prompt_text: string;
  model_name: "chatgpt" | "claude" | "perplexity";
  response_text: string;
  business_mentioned: boolean;
  competitor_mentions: Record<string, boolean>;
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
}

export type ModelName = ScanResult["model_name"];

export interface ScanWithResults extends Scan {
  results: ScanResult[];
}

export interface ModelBreakdown {
  model: ModelName;
  mentioned: number;
  total: number;
}

export interface CompetitorScore {
  name: string;
  score: number;
  mentionedCount: number;
  totalPrompts: number;
}
