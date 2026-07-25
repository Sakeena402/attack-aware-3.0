export type PlanCategory = "individual" | "enterprise";
export type Billing = "free" | "monthly" | "trial";

export interface Plan {
  id: string;
  category: PlanCategory;
  name: string;
  seats: number;
  priceUSD: number;
  priceUSDPerUser?: number;
  priceRs: number;
  billing: Billing;
  trialDays?: number;
  description: string;
  features: string[];
  highlight?: boolean;
}

export const plans: Plan[] = [
  { id: "ind-basic", category: "individual", name: "Basic", seats: 1, priceUSD: 0, priceRs: 0, billing: "free",
    description: "Perfect for individuals getting started",
    features: ["EN/UR training videos", "Games & quizzes", "1 user"] },

  { id: "ind-premium", category: "individual", name: "Premium", seats: 1, priceUSD: 13, priceRs: 3614, billing: "monthly",
    description: "For individuals who want the full toolkit",
    features: ["AI-generated quizzes", "Full bilingual (EN/UR) content library", "Priority support"],
    highlight: true },

  { id: "ent-demo", category: "enterprise", name: "Demo Trial", seats: 1, priceUSD: 15, priceRs: 4170, billing: "trial", trialDays: 15,
    description: "15-day full-feature trial for your org",
    features: ["Vishing & smishing templates", "AI generation"] },

  { id: "ent-basic", category: "enterprise", name: "Basic", seats: 10, priceUSD: 20, priceUSDPerUser: 2, priceRs: 5560, billing: "monthly",
    description: "Starting price for small teams (10 seats)",
    features: ["Templated phishing simulations", "EN/UR videos, games & quizzes"] },

  { id: "ent-advanced", category: "enterprise", name: "Advanced", seats: 25, priceUSD: 75, priceUSDPerUser: 3, priceRs: 20850, billing: "monthly",
    description: "For growing teams that need more coverage",
    features: ["AI-generated phishing & vishing", "Twilio integration"],
    highlight: true },

  { id: "ent-premium", category: "enterprise", name: "Premium", seats: 50, priceUSD: 165, priceUSDPerUser: 3.3, priceRs: 45870, billing: "monthly",
    description: "Full AI-enhanced suite for larger orgs",
    features: ["Phishing, vishing & smishing", "AI generation + Twilio", "50 seats"] },
];

export const landingPreviewIds = ["ind-basic", "ind-premium", "ent-basic"];

export function getPlanById(id: string) {
  return plans.find((p) => p.id === id);
}