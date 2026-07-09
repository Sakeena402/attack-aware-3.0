// backend/src/services/riskEngine.ts
//
// Enterprise Risk Scoring Engine — READ-ONLY pure functions.
// This file never writes to the database. All persistence is done by
// recalculateUserRisk() in analyticsService.ts.
//
// Architecture:
//   computeUserRiskProfile() orchestrates all sub-functions.
//   Each sub-function has exactly one responsibility.
//   All weights live in DEFAULT_RISK_WEIGHTS — ready for per-company DB
//   override in Phase 2 without touching any function signatures.

import mongoose from 'mongoose';
import SimulationResult from '../models/SimulationResult.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { UserGame } from '../models/UserGame.js';
import { UserVideo } from '../models/UserVideo.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type RiskLevel      = 'very_low' | 'low' | 'medium' | 'high' | 'critical';
export type Trend          = 'improving' | 'stable' | 'declining' | 'insufficient_data';
export type ConfidenceLabel = 'low' | 'medium' | 'high' | 'very_high';

export interface RiskBreakdown {
  riskScore:   number;
  riskLevel:   RiskLevel;
  confidence:  ConfidenceLabel;
  trend:       Trend;
  breakdown: {
    behaviorBase:       number;   // raw weighted behavior score (0–100)
    trainingAdjustment: number;   // negative = helpful (max -8)
    responseAdjustment: number;   // negative = fast reporter (clamped ±3)
    finalScore:         number;   // = riskScore
  };
  components: {
    clicks:      number;          // raw count, for explainability UI
    credentials: number;
    reports:     number;
    ignored:     number;
  };
  simulationCount: number;
  riskCalculatedAt: Date;
}

// Internal shape returned by the single aggregation pipeline
interface RawSimData {
  createdAt:           Date;
  difficulty:          string;
  credentialsSubmitted: boolean;
  linkClicked:         boolean;
  smsLinkClicked:      boolean;
  reportedPhishing:    boolean;
  voiceReported:       boolean;
  reportedAt:          Date | null;
  smsSentAt:           Date | null;
  callInitiatedAt:     Date | null;
  // Delivery signals
  smsDelivered:        boolean;
  emailOpened:         boolean;
  callAnswered:        boolean;
  // Smishing delivery status
  smsDeliveryStatus:   string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHTS — Centralized, named, Phase-2-ready for per-company DB override.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_RISK_WEIGHTS = {
  credentialsSubmitted: 55,
  linkClicked:          28,
  ignored:               4,
  reported:            -18,
  maxDifficultyMult:    1.5,   // 'expert' campaigns
  minDifficultyMult:    0.8,   // 'easy' campaigns
  //
  // MAX_PER_SIM = credentialsSubmitted * 1.0 (timeDecay) * maxDifficultyMult
  //             = 55 * 1.0 * 1.5 = 82.5
  // Used as the normalization denominator in calculateBehaviorScore().
  maxContributionPerSim: 82.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1: Time Decay — Exponential, no cliff edges.
//
// Formula: max(0.05, e^(-λ × ageInDays))
//   λ = 0.008 gives:
//     30-day  weight ≈ 0.79
//     90-day  weight ≈ 0.49
//     180-day weight ≈ 0.24
//     365-day weight ≈ 0.05 (floor)
//
// The 0.05 floor ensures very old events never vanish completely.
// A pattern of historical failures is still a weak signal.
// ─────────────────────────────────────────────────────────────────────────────
export function calculateTimeDecayWeight(createdAt: Date, now: Date): number {
  const LAMBDA     = 0.008;
  const MS_PER_DAY = 86_400_000;
  const ageInDays  = Math.max(0, (now.getTime() - createdAt.getTime()) / MS_PER_DAY);
  return Math.max(0.05, Math.exp(-LAMBDA * ageInDays));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2: Difficulty Weight
//
// Harder campaigns have higher weight in both directions:
//   - Failing a hard campaign hurts more (employee should have spotted it)
//   - Reporting a hard campaign rewards more (harder to detect)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateDifficultyWeight(difficulty: string): number {
  switch (difficulty) {
    case 'easy':   return 0.8;
    case 'hard':   return 1.25;
    case 'expert': return 1.5;
    case 'medium':
    default:       return 1.0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3: Weighted Contribution per simulation
//
// Combines outcome + time decay + difficulty into a single contribution value.
// ─────────────────────────────────────────────────────────────────────────────
export function calculateWeightedContribution(
  sim: RawSimData,
  now: Date,
): number {
  const isClicked     = sim.smsLinkClicked || sim.linkClicked;
  const isCompromised = sim.credentialsSubmitted;
  const isReported    = sim.reportedPhishing || sim.voiceReported;

  let rawContribution: number;
  if (isCompromised) {
    rawContribution = DEFAULT_RISK_WEIGHTS.credentialsSubmitted;
  } else if (isClicked) {
    rawContribution = DEFAULT_RISK_WEIGHTS.linkClicked;
  } else if (isReported) {
    rawContribution = DEFAULT_RISK_WEIGHTS.reported;
  } else {
    rawContribution = DEFAULT_RISK_WEIGHTS.ignored;
  }

  const timeWeight       = calculateTimeDecayWeight(sim.createdAt, now);
  const difficultyWeight = calculateDifficultyWeight(sim.difficulty);
  return rawContribution * timeWeight * difficultyWeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 4: Behavior Score
//
// Normalizes the sum of weighted contributions to 0–100.
// MAX_PER_SIM = 82.5 (expert difficulty, full time weight, credentials).
// ─────────────────────────────────────────────────────────────────────────────
export function calculateBehaviorScore(
  sims: RawSimData[],
  now: Date,
): {
  score: number;
  components: { clicks: number; credentials: number; reports: number; ignored: number };
} {
  if (sims.length === 0) {
    return { score: 0, components: { clicks: 0, credentials: 0, reports: 0, ignored: 0 } };
  }

  let sumContribs = 0;
  let clicks = 0, credentials = 0, reports = 0, ignored = 0;

  for (const sim of sims) {
    sumContribs += calculateWeightedContribution(sim, now);
    if (sim.credentialsSubmitted)                   credentials++;
    else if (sim.smsLinkClicked || sim.linkClicked)  clicks++;
    else if (sim.reportedPhishing || sim.voiceReported) reports++;
    else                                             ignored++;
  }

  const maxPossible = sims.length * DEFAULT_RISK_WEIGHTS.maxContributionPerSim;
  const raw         = (sumContribs / Math.max(maxPossible, 1)) * 100;
  const score       = Math.min(100, Math.max(0, Math.round(raw)));

  return { score, components: { clicks, credentials, reports, ignored } };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 5: Confidence Label — metadata only, NEVER used as a multiplier.
//
// A user with 1 bad simulation shows a high risk score + "low" confidence.
// That is the correct, honest answer. Confidence tells the admin how much
// to trust the score — it does not soften it.
// ─────────────────────────────────────────────────────────────────────────────
export function calculateConfidenceLabel(total: number): ConfidenceLabel {
  if (total <= 5)  return 'low';
  if (total <= 15) return 'medium';
  if (total <= 30) return 'high';
  return 'very_high';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 6: Training Adjustment
//
// Returns a NEGATIVE number (up to -8) or 0.
//
// Rules:
//   - If user submitted credentials in the last 30 days → return 0 immediately.
//     You cannot train away fresh evidence of compromise.
//   - Only count training activity in the last 90 days.
//   - Quiz bonus: avg quiz percentage (for quizzes ≥ 60%) maps 60–100% → 0–6 pts
//   - Video bonus: min(completed videos × 0.5, 3)
//   - Game bonus:  min(games played × 0.3, 2)
//   - Total capped at -8 (cannot move user between major risk tiers alone).
// ─────────────────────────────────────────────────────────────────────────────
export async function calculateTrainingAdjustment(
  userId: string,
  now: Date,
): Promise<number> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Guard: if credentials submitted in last 30 days, training bonus = 0
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const recentFailure = await SimulationResult.exists({
    userId: userObjectId,
    credentialsSubmitted: true,
    createdAt: { $gte: thirtyDaysAgo },
  });
  if (recentFailure) return 0;

  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);

  // Fetch quiz, video, game data in parallel
  const [quizzes, videoCount, gameCount] = await Promise.all([
    UserQuiz.find({
      userId: userObjectId,
      completedAt: { $gte: ninetyDaysAgo },
    }).select('score totalQuestions').lean(),

    UserVideo.countDocuments({
      userId: userObjectId,
      status: 'Completed',
      createdAt: { $gte: ninetyDaysAgo },
    }),

    UserGame.countDocuments({
      userId: userObjectId,
      playedAt: { $gte: ninetyDaysAgo },
    }),
  ]);

  // Quiz bonus: average pct of quizzes that scored ≥ 60%
  const eligibleQuizzes = quizzes.filter((q: any) => {
    const pct = q.totalQuestions > 0 ? (q.score / q.totalQuestions) * 100 : 0;
    return pct >= 60;
  });
  let quizBonus = 0;
  if (eligibleQuizzes.length > 0) {
    const avgPct = eligibleQuizzes.reduce((sum: number, q: any) =>
      sum + (q.score / q.totalQuestions) * 100, 0,
    ) / eligibleQuizzes.length;
    // Map 60–100% → 0–6 points
    quizBonus = ((avgPct - 60) / 40) * 6;
  }

  const videoBonus = Math.min(videoCount * 0.5, 3);
  const gameBonus  = Math.min(gameCount  * 0.3, 2);

  const total = quizBonus + videoBonus + gameBonus;
  return -Math.min(total, 8); // negative, capped at -8
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 7: Response Time Adjustment
//
// Only applied to simulations with CONFIRMED delivery:
//   SMS:   smsSent === true AND smsDelivered === true (delivery status not failed)
//   Email: emailOpened === true (proves it was received and seen)
//   Voice: callAnswered === true
//
// If a simulation has no confirmed delivery signal → excluded entirely.
// Per-sim adjustment:
//   < 5 min   reported → -3
//   < 30 min  reported → -2
//   < 3 hrs   reported → -1
//   reported but late  →  0
//   not reported       → +1  (small penalty — kept minimal, secondary signal)
//
// Final: clamp(average, -3, +3)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateResponseAdjustment(sims: RawSimData[]): number {
  const delivered = sims.filter(sim => {
    const smsDelivered   = sim.smsSentAt !== null && sim.smsDelivered &&
                           sim.smsDeliveryStatus !== 'failed';
    const emailConfirmed = sim.emailOpened;
    const voiceConfirmed = sim.callAnswered;
    return smsDelivered || emailConfirmed || voiceConfirmed;
  });

  if (delivered.length === 0) return 0;

  const perSimAdj = delivered.map(sim => {
    if (!sim.reportedAt) return +1; // delivered but never reported

    const sentAt    = sim.smsSentAt ?? sim.callInitiatedAt ?? sim.createdAt;
    const diffMs    = sim.reportedAt.getTime() - sentAt.getTime();

    if (diffMs < 300_000)    return -3; // < 5 min — excellent
    if (diffMs < 1_800_000)  return -2; // < 30 min — good
    if (diffMs < 10_800_000) return -1; // < 3 hrs — average
    return 0;                            // reported but late
  });

  const avg = perSimAdj.reduce((s, v) => s + v, 0) / perSimAdj.length;
  return Math.min(3, Math.max(-3, Math.round(avg)));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 8: Trend Detection
//
// Uses FIXED rolling windows, not a chronological half-split.
// A half-split is statistically fragile: with 100 old sims and 4 recent ones,
// the "recent" half contains 52 — many of them old.
//
// Windows:
//   recent:     last 90 days
//   historical: 91–365 days ago
//
// Minimum 3 simulations required in EACH window for a meaningful trend.
// Otherwise: 'insufficient_data' (honest, not fabricated).
// ─────────────────────────────────────────────────────────────────────────────
export function calculateTrend(sims: RawSimData[], now: Date): Trend {
  const RECENT_MS     = 90  * 86_400_000;
  const HIST_START_MS = 91  * 86_400_000;
  const HIST_END_MS   = 365 * 86_400_000;
  const MIN_SIMS      = 3;

  const recent     = sims.filter(s => now.getTime() - s.createdAt.getTime() <= RECENT_MS);
  const historical = sims.filter(s => {
    const age = now.getTime() - s.createdAt.getTime();
    return age > HIST_START_MS && age <= HIST_END_MS;
  });

  if (recent.length < MIN_SIMS || historical.length < MIN_SIMS) {
    return 'insufficient_data';
  }

  const failRate = (group: RawSimData[]) => {
    const failures = group.filter(s => s.credentialsSubmitted || s.smsLinkClicked || s.linkClicked);
    return failures.length / group.length;
  };

  const delta = failRate(recent) - failRate(historical);

  if (delta <= -0.10) return 'improving';
  if (delta >= +0.10) return 'declining';
  return 'stable';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 9: Risk Level — 5-tier, industry-aligned
//
// Backward-compat note: old 3-tier code that reads riskLevel from User still
// works because 'low', 'medium', 'high' remain valid values in the extended enum.
// ─────────────────────────────────────────────────────────────────────────────
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'very_low';
  if (score <= 50) return 'low';
  if (score <= 70) return 'medium';
  if (score <= 85) return 'high';
  return 'critical';
}

// Backward-compat shim for code that still expects the 3-tier enum.
// Use the 5-tier version everywhere new code is written.
export function getRiskLevel3Tier(score: number): 'low' | 'medium' | 'high' {
  if (score <= 25) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 10 (Orchestrator): computeUserRiskProfile
//
// READ-ONLY — does NOT write to any collection.
// All writes happen in recalculateUserRisk() in analyticsService.ts.
//
// Single aggregation pipeline:
//   $match → $lookup (Campaign, difficulty only) → $addFields → $project
// No N+1 queries. Uses the { userId: 1, createdAt: -1 } compound index.
// ─────────────────────────────────────────────────────────────────────────────
export async function computeUserRiskProfile(userId: string): Promise<RiskBreakdown> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now          = new Date();

  // ── Single aggregation — joins Campaign only for the difficulty field ──────
  const rawSims: RawSimData[] = await SimulationResult.aggregate([
    { $match: { userId: userObjectId } },
    {
      $lookup: {
        from:     'campaigns',
        let:      { cid: '$campaignId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$cid'] } } },
          { $project: { difficulty: 1 } },
        ],
        as: 'campaign',
      },
    },
    { $addFields: { campaign: { $first: '$campaign' } } },
    {
      $project: {
        createdAt:           1,
        difficulty:          { $ifNull: ['$campaign.difficulty', 'medium'] },
        credentialsSubmitted: { $ifNull: ['$credentialsSubmitted', false] },
        linkClicked:         { $ifNull: ['$linkClicked',          false] },
        smsLinkClicked:      { $ifNull: ['$smsLinkClicked',       false] },
        reportedPhishing:    { $ifNull: ['$reportedPhishing',     false] },
        voiceReported:       { $ifNull: ['$voiceReported',        false] },
        reportedAt:          1,
        smsSentAt:           1,
        callInitiatedAt:     1,
        // Delivery signals for response-time adjustment
        smsDelivered:        { $ifNull: ['$smsDelivered',         false] },
        emailOpened:         { $ifNull: ['$emailOpened',          false] },
        callAnswered:        { $ifNull: ['$callAnswered',         false] },
        smsDeliveryStatus:   1,
      },
    },
  ]);

  // ── Behavior score (pure function — no async) ─────────────────────────────
  const { score: behaviorBase, components } = calculateBehaviorScore(rawSims, now);

  // ── Training adjustment (async — reads UserQuiz, UserVideo, UserGame) ─────
  const trainingAdjustment = await calculateTrainingAdjustment(userId, now);

  // ── Response-time adjustment (pure function) ──────────────────────────────
  const responseAdjustment = calculateResponseAdjustment(rawSims);

  // ── Final score ───────────────────────────────────────────────────────────
  const finalScore = Math.min(100, Math.max(0,
    Math.round(behaviorBase + trainingAdjustment + responseAdjustment),
  ));

  // ── Metadata ──────────────────────────────────────────────────────────────
  const riskLevel  = getRiskLevel(finalScore);
  const confidence = calculateConfidenceLabel(rawSims.length);
  const trend      = calculateTrend(rawSims, now);

  return {
    riskScore: finalScore,
    riskLevel,
    confidence,
    trend,
    breakdown: {
      behaviorBase,
      trainingAdjustment,
      responseAdjustment,
      finalScore,
    },
    components,
    simulationCount: rawSims.length,
    riskCalculatedAt: now,
  };
}
