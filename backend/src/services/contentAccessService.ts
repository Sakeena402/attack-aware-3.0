// backend/src/services/contentAccessService.ts
// How many games / quizzes (by list position) are open for users who are not unlocked
// through an approved company plan.

import { AuthRequest } from '../types/index.js';
import { getIndividualPlanContext } from './contentLimitsService.js';

export interface OpenCounts {
  games: number;
  quizzes: number;
}

// Free preview used before: applies to employees of a company with no approved plan
const DEFAULT_OPEN: OpenCounts = { games: 3, quizzes: 5 };

export async function getOpenCounts(user: AuthRequest['user']): Promise<OpenCounts> {
  // Individual accounts: the open items match their plan's monthly allowance exactly
  if (user && !user.companyId && user.role === 'individual') {
    const ctx = await getIndividualPlanContext(user.id);
    const c = ctx.limits?.content;
    if (c) {
      return { games: c.games, quizzes: Math.max(c.quizzesEn, c.quizzesUr) };
    }
  }
  return DEFAULT_OPEN;
}