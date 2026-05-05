// ============================================
// Surven Design Constants
// Derived from UI/UX Pro Max design system
// ============================================

export const COLORS = {
  bg: "#F2EEE3",
  surface: "#EDE8DC",
  surfaceAlt: "#E5DFCF",
  fg: "#1A1C1A",
  fgSecondary: "#3D3F3D",
  fgMuted: "#6B6D6B",
  primary: "#96A283",
  primaryHover: "#7D8E6C",
  secondary: "#B54631",
  secondaryHover: "#8C3522",
  danger: "#B54631",
  warning: "#C97B45",
  success: "#96A283",
  info: "#6BA3F5",
  border: "#C8C2B4",
  scoreRed: "#B54631",
  scoreOrange: "#C97B45",
  scoreYellow: "#B8A030",
  scoreGreen: "#96A283",
  // Thermal gradient colors
  thermal0: "#B54631",
  thermal1: "#C97B45",
  thermal2: "#B8A030",
  thermal3: "#7D8E6C",
  thermal4: "#96A283",
} as const;

export const ANIMATION = {
  micro: { duration: 0.15 },
  fast: { duration: 0.25 },
  normal: { duration: 0.35 },
  slow: { duration: 0.6 },
  gauge: { duration: 1.2 },
  spring: { type: "spring" as const, stiffness: 100, damping: 30 },
  springSnappy: { type: "spring" as const, stiffness: 200, damping: 25 },
  stagger: { staggerChildren: 0.05, delayChildren: 0.1 },
  staggerSlow: { staggerChildren: 0.1, delayChildren: 0.2 },
  easeOut: [0.16, 1, 0.3, 1] as const,
} as const;

export const BREAKPOINTS = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export const AI_MODELS = [
  { id: "chatgpt", name: "ChatGPT", color: "#5BAF92" },
  { id: "claude", name: "Claude", color: "#D4943A" },
  { id: "gemini", name: "Gemini", color: "#6BA3F5" },
  { id: "google_ai", name: "Google AI", color: "#5CBF74" },
] as const;

// Single source of truth for competitor visualization colors.
// Used by ComparisonChart, BrandChip, leaderboard bars + chip filter.
// Order is intentional: warm tones first so the most common 1–3 competitor
// scenarios pick colors that harmonize with sage/cream. The two cool tones
// (slate, blue) sit at the end and only appear when a brand name happens to
// hash to those slots.
export const COMPETITOR_PALETTE = [
  "#C97B45", // amber
  "#B8A030", // gold
  "#A07878", // dusty rose
  "#9B7EC8", // muted purple (categorical accent)
  "#7A8FA6", // slate
  "#6BA3F5", // blue
] as const;

export const OTHER_INDUSTRY_OPTION = "Other (specify)";

export const PROMPTS_PER_PLAN = {
  free: 50,
  plus: 150,
  premium: 300,
  managed: 300,
  admin: 300,
} as const;

export function getPromptCountForPlan(plan?: string | null): number {
  if (!plan) return PROMPTS_PER_PLAN.plus;
  if (plan in PROMPTS_PER_PLAN) {
    return PROMPTS_PER_PLAN[plan as keyof typeof PROMPTS_PER_PLAN];
  }
  return PROMPTS_PER_PLAN.plus;
}

export const INDUSTRIES = [
  "Dentist",
  "Restaurant",
  "Plumber",
  "Marketing Agency",
  "Real Estate Agent",
  "Lawyer",
  "Auto Mechanic",
  "Salon",
  "Gym",
  "Accountant",
  "Chiropractor",
  "Insurance Agent",
  "Photographer",
  "Veterinarian",
  "Financial Advisor",
  "Home Inspector",
  "HVAC Technician",
  "Landscaper",
  "Personal Trainer",
  "Therapist",
  "Ecommerce",
  OTHER_INDUSTRY_OPTION,
] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

