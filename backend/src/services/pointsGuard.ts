// backend/src/services/pointsGuard.ts
// Runs a points award at most once per user + item + month.

import { Types } from 'mongoose';
import { PointsAward, PointsAwardType } from '../models/PointsAward.js';
import { currentPeriod } from './planLimitsService.js';

/**
 * Claims the monthly award slot, then runs `award`. Returns true if the points were given,
 * false if this item already paid out this month. If `award` throws, the claim is
 * released so the user can earn the points on a retry.
 */
export async function awardMonthlyPoints(
  userId: string,
  awardType: PointsAwardType,
  contentId: string,
  award: () => Promise<unknown>
): Promise<boolean> {
  // Make sure the unique index exists before relying on it
  await PointsAward.init();

  const key = {
    userId: new Types.ObjectId(userId),
    awardType,
    contentId,
    period: currentPeriod(),
  };

  try {
    await PointsAward.create(key);
  } catch (err: any) {
    if (err?.code === 11000) return false; // already awarded this month
    throw err;
  }

  try {
    await award();
    return true;
  } catch (err) {
    await PointsAward.deleteOne(key).catch(() => undefined);
    throw err;
  }
}