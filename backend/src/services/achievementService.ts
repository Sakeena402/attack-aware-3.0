// backend/src/services/achievementService.ts
//
// Event-routed achievement evaluation.
//
// Design principles:
//   - ONLY runs checks that CAN be triggered by the given event.
//   - The 6-month SimulationResult aggregation runs ONLY on 'report' and
//     'risk_recalc' triggers — never on 'quiz_*', 'game_*', or 'video_*'.
//   - Returns a (possibly empty) string[] of newly earned achievement names.
//   - The caller ($addToSet) is responsible for deduplication.

import mongoose from 'mongoose';
import SimulationResult from '../models/SimulationResult.js';
import { UserQuiz }      from '../models/UserQuiz.js';
import { User }          from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT CHECKS
// Each check is a private async function with a single responsibility.
// ─────────────────────────────────────────────────────────────────────────────

/** True if the user has ever reported a phishing simulation. */
async function checkFirstReporter(
  userObjectId: mongoose.Types.ObjectId,
): Promise<boolean> {
  const existing = await User.findById(userObjectId)
    .select('achievements')
    .lean() as any;
  // Already earned — skip the DB query
  if (existing?.achievements?.includes('First Reporter')) return false;

  const hasReported = await SimulationResult.exists({
    userId: userObjectId,
    $or: [{ reportedPhishing: true }, { voiceReported: true }],
  });
  return !!hasReported;
}

/** True if the user has ≥ 10 quizzes where score% ≥ 90. */
async function checkQuizMaster(
  userObjectId: mongoose.Types.ObjectId,
): Promise<boolean> {
  const existing = await User.findById(userObjectId)
    .select('achievements')
    .lean() as any;
  if (existing?.achievements?.includes('Quiz Master')) return false;

  const quizzes = await UserQuiz.find({ userId: userObjectId })
    .select('score totalQuestions')
    .lean();

  const highCount = quizzes.filter((q: any) => {
    const pct = q.totalQuestions > 0 ? (q.score / q.totalQuestions) * 100 : 0;
    return pct >= 90;
  }).length;

  return highCount >= 10;
}

/** True if user had ≥ 1 delivered simulation in last 6 months with zero clicks. */
async function checkZeroClicks6Months(
  userObjectId: mongoose.Types.ObjectId,
): Promise<boolean> {
  // const existing = await User.findById(userObjectId)
  //   .select('achievements')
  //   .lean() as any;
  // Achievement is dynamic — re-evaluate even if already earned (could be lost)
  // We just skip pushing a duplicate thanks to $addToSet on the caller side.

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [totalSims, clickSims] = await Promise.all([
    SimulationResult.countDocuments({
      userId:    userObjectId,
      createdAt: { $gte: sixMonthsAgo },
    }),
    SimulationResult.countDocuments({
      userId:    userObjectId,
      createdAt: { $gte: sixMonthsAgo },
      $or: [
        { smsLinkClicked:      true },
        { linkClicked:         true },
        { credentialsSubmitted: true },
      ],
    }),
  ]);

  return totalSims > 0 && clickSims === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — evaluateAchievements
//
// Route table:
//   'report'      → First Reporter + Zero Clicks — 6 Months
//   'quiz_90'     → Quiz Master
//   'risk_recalc' → Zero Clicks — 6 Months  (batch path — post risk calc)
//   anything else → [] immediately (NO queries run)
// ─────────────────────────────────────────────────────────────────────────────
export async function evaluateAchievements(
  userId: string,
  trigger: string,
): Promise<string[]> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const earned: string[] = [];

  if (trigger === 'report') {
    const [isFirst, isZeroClicks] = await Promise.all([
      checkFirstReporter(userObjectId),
      checkZeroClicks6Months(userObjectId),
    ]);
    if (isFirst)      earned.push('First Reporter');
    if (isZeroClicks) earned.push('Zero Clicks \u2014 6 Months');
  } else if (trigger === 'quiz_90') {
    if (await checkQuizMaster(userObjectId)) {
      earned.push('Quiz Master');
    }
  } else if (trigger === 'risk_recalc') {
    if (await checkZeroClicks6Months(userObjectId)) {
      earned.push('Zero Clicks \u2014 6 Months');
    }
  }
  // All other triggers: return [] without running any queries.

  return earned;
}
