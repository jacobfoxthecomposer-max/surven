/**
 * Single source of truth for what each plan tier gets. Read by the
 * leaderboard cards, the cluster dominance card, the prompts settings
 * tab, and any future plan-gated UI (blur overlays, upgrade CTAs, etc.)
 *
 * "free" is treated as the TRIAL / lapsed-trial state — Joey's product
 * model has no permanent free tier, just a 14-day trial of Plus that
 * downgrades to "free" if the user doesn't convert. Numbers below are
 * intentionally low for "free" so the upgrade reason stays obvious.
 *
 * If/when the DB enum gets a real "trial" value, swap "free" out here
 * — every consumer reads through these helpers so the migration is one
 * file's worth of work.
 */
import type { UserProfile } from "@/types/database";

export type Plan = UserProfile["plan"];

export interface PlanFeatures {
  /** Display label for the tier (UI). */
  label: string;
  /** Max competitors trackable for the leaderboard cards. */
  maxCompetitors: number;
  /** Max prompts (custom + defaults) the user can have on their account. */
  maxPrompts: number;
  /** Daily scan budget enforced server-side in /api/scan. */
  scansPerDay: number;
  /** Whether premium-only data is blurred behind an upgrade overlay. */
  blursPremiumData: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    // Treated as Trial / post-trial fallback. No permanent free product.
    label: "Trial",
    maxCompetitors: 1,
    maxPrompts: 50,
    scansPerDay: 5,
    blursPremiumData: true,
  },
  plus: {
    label: "Plus",
    maxCompetitors: 1,
    maxPrompts: 150,
    scansPerDay: 10,
    blursPremiumData: false,
  },
  premium: {
    label: "Premium",
    maxCompetitors: 5,
    maxPrompts: 300,
    scansPerDay: 20,
    blursPremiumData: false,
  },
  admin: {
    // Internal — unlimited everything for QA / dogfooding.
    label: "Admin",
    maxCompetitors: 5,
    maxPrompts: 1000,
    scansPerDay: 1000,
    blursPremiumData: false,
  },
};

export function competitorLimit(plan: Plan): number {
  return PLAN_FEATURES[plan].maxCompetitors;
}

export function promptLimit(plan: Plan): number {
  return PLAN_FEATURES[plan].maxPrompts;
}

export function scanLimit(plan: Plan): number {
  return PLAN_FEATURES[plan].scansPerDay;
}

export function planLabel(plan: Plan): string {
  return PLAN_FEATURES[plan].label;
}
