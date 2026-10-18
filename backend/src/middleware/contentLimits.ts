// backend/src/middleware/contentLimits.ts
// Route-level enforcement of the monthly video / game / quiz allowances.
// Controllers are untouched.

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import { Quiz } from '../models/Quiz.js';
import { ContentType } from '../models/ContentUsage.js';
import { isPlanExempt } from '../config/planExemptions.js';
import { ActivePlanContext, getActivePlanContext } from '../services/planLimitsService.js';
import {
  ContentLanguage,
  assertContentQuota,
  getIndividualPlanContext,
  recordContentUsage,
  videoLanguage,
} from '../services/contentLimitsService.js';

function sendError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
  } else {
    console.error('[contentLimits]', error);
    res.status(500).json({ success: false, error: fallback });
  }
}

// Usage is recorded only if the controller answers with a success status.
function recordOnSuccess(
  res: Response,
  ctx: ActivePlanContext,
  userId: string,
  type: ContentType,
  contentId: string,
  language?: ContentLanguage
): void {
  if (!ctx.limits) return;
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    recordContentUsage(ctx, userId, type, contentId, language).catch((err) =>
      console.error('[contentLimits] failed to record content usage:', err)
    );
  });
}

/**
 * record: false → only checks the allowance (used when a video / game / quiz starts)
 * record: true  → checks, then counts the item once the request succeeds
 */
function contentLimit(type: ContentType, opts: { record: boolean }) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

      const contentId = req.params.id;
      if (!contentId) return next();
      // Invalid ids fall through so the controller returns its own error
      if (type !== 'video' && !mongoose.isValidObjectId(contentId)) return next();

      // AI-generated quizzes are extra ("20 + AI"), so they do not use the quiz allowance
      if (type === 'quiz') {
        const quiz: any = await Quiz.findById(contentId).select('source').lean();
        if (!quiz || quiz.source === 'ai_generated') return next();
      }

      // Company accounts follow their company's plan; individual accounts follow their own plan
      let ctx: ActivePlanContext;
      if (req.user.companyId) {
        ctx = await getActivePlanContext(req.user.companyId);
      } else if (req.user.role === 'individual') {
        ctx = await getIndividualPlanContext(req.user.id);
      } else {
        return next();
      }

      const language = type === 'video' ? videoLanguage(contentId) : undefined;
      await assertContentQuota(ctx, req.user.id, type, contentId, language);

      if (opts.record) recordOnSuccess(res, ctx, req.user.id, type, contentId, language);

      next();
    } catch (error) {
      sendError(res, error, 'Plan check failed');
    }
  };
}

/** GET /videos/:id/access (video page opens) */
export const enforceVideoStart = contentLimit('video', { record: false });
/** POST /videos/:id/watch */
export const enforceVideoWatch = contentLimit('video', { record: true });
/** GET /games/:id (game opens) */
export const enforceGameStart = contentLimit('game', { record: false });
/** POST /games/:id/save-score */
export const enforceGameComplete = contentLimit('game', { record: true });
/** GET /quizzes/:id/questions (quiz starts) */
export const enforceQuizStart = contentLimit('quiz', { record: false });
/** POST /quizzes/:id/submit */
export const enforceQuizComplete = contentLimit('quiz', { record: true });