/**
 * Shared constants used across the audit/apply-fix and audit/generate routes.
 * Keeps copy + plan-tier definitions in one place so we can't drift between
 * endpoints.
 */

export const MANAGED_PLAN_CTA = {
  url: "https://surven.ai/pricing",
  headline: "Skip the paste — let our team handle this for you",
  body:
    "Surven Managed deploys every fix to your site automatically, gets you listed on the directories AI engines cite most, and refreshes your content monthly so your visibility keeps climbing. You focus on the business — we focus on getting you cited.",
  buttonLabel: "See Managed plans",
} as const;

export type ManagedPlanCta = typeof MANAGED_PLAN_CTA;

/**
 * Plans that allow extension API key validation + audit/fix calls.
 * Keep in sync with the `validate_extension_api_key` SQL function.
 */
export const PAID_PLANS = ["plus", "premium", "admin"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];
