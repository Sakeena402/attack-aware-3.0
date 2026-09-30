// backend/src/config/planLimits.ts
// Single source of truth for per-plan limits, keyed by MembershipPlan.planId.
// Values come from cost estimation-AttackAware.xlsx. All counts are per calendar month (UTC).

export type Channel = 'phishing' | 'smishing' | 'vishing';

export interface PlanLimits {
  /** Max distinct campaigns that may be RUN (launched / sent) per channel per month. 0 = channel not included. */
  campaignsPerMonth: Record<Channel, number>;
  /** AI generation per channel. Informational until the AI routes are gated. */
  ai: { phishing: boolean; smishing: boolean; vishing: boolean; quizzes: boolean };
  /** Monthly content allowance from the sheet. NOT enforced yet. */
  content: {
    videosEn: number;
    videosUr: number;
    games: number;
    quizzesEn: number;
    quizzesUr: number;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  'ind-basic': {
    campaignsPerMonth: { phishing: 0, smishing: 0, vishing: 0 },
    ai: { phishing: false, smishing: false, vishing: false, quizzes: false },
    content: { videosEn: 4, videosUr: 4, games: 4, quizzesEn: 4, quizzesUr: 4 },
  },
  'ind-premium': {
    campaignsPerMonth: { phishing: 0, smishing: 0, vishing: 0 },
    ai: { phishing: false, smishing: false, vishing: false, quizzes: true },
    content: { videosEn: 20, videosUr: 20, games: 6, quizzesEn: 20, quizzesUr: 20 },
  },
  'ent-demo': {
    campaignsPerMonth: { phishing: 1, smishing: 1, vishing: 1 },
    // Sheet lists "AI generation" for Demo without naming channels
    ai: { phishing: true, smishing: true, vishing: true, quizzes: false },
    content: { videosEn: 10, videosUr: 10, games: 5, quizzesEn: 10, quizzesUr: 10 },
  },
  'ent-basic': {
    campaignsPerMonth: { phishing: 4, smishing: 0, vishing: 0 },
    ai: { phishing: false, smishing: false, vishing: false, quizzes: false },
    content: { videosEn: 10, videosUr: 10, games: 3, quizzesEn: 10, quizzesUr: 10 },
  },
  'ent-advanced': {
    campaignsPerMonth: { phishing: 3, smishing: 1, vishing: 1 },
    ai: { phishing: true, smishing: false, vishing: true, quizzes: false },
    content: { videosEn: 20, videosUr: 20, games: 6, quizzesEn: 20, quizzesUr: 20 },
  },
  'ent-premium': {
    campaignsPerMonth: { phishing: 4, smishing: 1, vishing: 1 },
    ai: { phishing: true, smishing: true, vishing: true, quizzes: true },
    content: { videosEn: 20, videosUr: 20, games: 6, quizzesEn: 20, quizzesUr: 20 },
  },
};

/** Returns null for plans that are not in the table (legacy plans) so old behaviour is kept for them. */
export function getLimitsForPlan(plan: { planId?: string } | null | undefined): PlanLimits | null {
  if (!plan?.planId) return null;
  return Object.prototype.hasOwnProperty.call(PLAN_LIMITS, plan.planId)
    ? PLAN_LIMITS[plan.planId]
    : null;
}