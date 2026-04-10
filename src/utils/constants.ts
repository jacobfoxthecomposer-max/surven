// ============================================
// Surven Design Constants
// Derived from UI/UX Pro Max design system
// ============================================

export const COLORS = {
  bg: "#0f172a",
  surface: "#1e293b",
  surfaceAlt: "#334155",
  fg: "#f1f5f9",
  fgSecondary: "#cbd5e1",
  fgMuted: "#94a3b8",
  primary: "#4361ee",
  primaryHover: "#3651d4",
  secondary: "#06d6a0",
  secondaryHover: "#05b889",
  danger: "#ef4444",
  warning: "#f97316",
  success: "#06d6a0",
  info: "#4361ee",
  border: "#334155",
  scoreRed: "#ef4444",
  scoreOrange: "#f97316",
  scoreYellow: "#84cc16",
  scoreGreen: "#06d6a0",
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
  { id: "chatgpt", name: "ChatGPT", color: "#10a37f" },
  { id: "claude", name: "Claude", color: "#d97706" },
  { id: "gemini", name: "Gemini", color: "#4285f4" },
  { id: "google_search", name: "Google Search", color: "#ea4335" },
] as const;

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
] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export function getScoreColor(score: number): string {
  if (score < 25) return COLORS.scoreRed;
  if (score < 50) return COLORS.scoreOrange;
  if (score < 75) return COLORS.scoreYellow;
  return COLORS.scoreGreen;
}

export function getScoreLabel(score: number): string {
  if (score < 25) return "Not Visible";
  if (score < 50) return "Low Visibility";
  if (score < 75) return "Moderately Visible";
  return "Highly Visible";
}
