// backend/src/services/contentLimitsService.ts
// Monthly per-user allowance for videos, games and quizzes (numbers come from config/planLimits.ts).

import { Types } from 'mongoose';
import { AppError } from '../utils/errorHandler.js';
import { ContentUsage, ContentType } from '../models/ContentUsage.js';
import { User } from '../models/User.js';
import { PLAN_LIMITS } from '../config/planLimits.js';
import { ActivePlanContext, currentPeriod } from './planLimitsService.js';

export type ContentLanguage = 'en' | 'ur';

/** Static video ids look like 'en-1' / 'ur-3'. */
export function videoLanguage(videoId: string): ContentLanguage {
  return videoId.toLowerCase().startsWith('ur') ? 'ur' : 'en';
}

/**
 * Works out which individual plan a user is on from what is stored on the user record.
 * Exact plan id wins, then anything containing "premium", otherwise the free Basic plan.
 */
function resolveIndividualPlanId(...values: Array<string | null | undefined>): 'ind-basic' | 'ind-premium' {
  const cleaned = values.map((v) => (v ?? '').trim().toLowerCase()).filter(Boolean);
  for (const v of cleaned) {
    if (v === 'ind-premium') return 'ind-premium';
    if (v === 'ind-basic') return 'ind-basic';
  }
  if (cleaned.some((v) => v.includes('premium'))) return 'ind-premium';
  return 'ind-basic';
}

/** Plan context for individual accounts (no company). No approval or trial rules apply. */
export async function getIndividualPlanContext(userId: string): Promise<ActivePlanContext> {
  const user: any = await User.findById(userId).select('subscriptionPlan subscriptionPackage').lean();
  const planId = resolveIndividualPlanId(user?.subscriptionPlan, user?.subscriptionPackage);

  return {
    company: null,
    plan: {
      planId,
      name: planId === 'ind-premium' ? 'Individual Premium' : 'Individual Basic',
    },
    limits: PLAN_LIMITS[planId],
  };
}

interface ResolvedQuota {
  quota: number;
  label: string;
  language?: ContentLanguage;
}

function resolveQuota(
  ctx: ActivePlanContext,
  type: ContentType,
  language?: ContentLanguage
): ResolvedQuota | null {
  if (!ctx.limits) return null; // legacy plan → old behaviour
  const c = ctx.limits.content;

  switch (type) {
    case 'video':
      return language === 'ur'
        ? { quota: c.videosUr, label: 'Urdu videos', language: 'ur' }
        : { quota: c.videosEn, label: 'English videos', language: 'en' };
    case 'game':
      return { quota: c.games, label: 'games' };
    case 'quiz':
      // The backend is not told which language a quiz was taken in, and every plan
      // has the same EN and UR number, so one shared pool is used.
      return { quota: Math.max(c.quizzesEn, c.quizzesUr), label: 'quizzes' };
  }
}

export async function assertContentQuota(
  ctx: ActivePlanContext,
  userId: string,
  type: ContentType,
  contentId: string,
  language?: ContentLanguage
): Promise<void> {
  const resolved = resolveQuota(ctx, type, language);
  if (!resolved) return;

  const uid = new Types.ObjectId(userId);
  const period = currentPeriod();

  // Already counted this month → replaying / rewatching / retaking is free
  const alreadyCounted = await ContentUsage.exists({
    userId: uid,
    contentType: type,
    contentId,
    period,
  });
  if (alreadyCounted) return;

  if (resolved.quota <= 0) {
    throw new AppError(
      `Your ${ctx.plan.name} plan does not include ${resolved.label}. Upgrade your plan to use them.`,
      403
    );
  }

  const used = await ContentUsage.countDocuments({
    userId: uid,
    contentType: type,
    period,
    ...(resolved.language ? { language: resolved.language } : {}),
  });

  if (used >= resolved.quota) {
    throw new AppError(
      `Monthly limit reached: your ${ctx.plan.name} plan includes ${resolved.quota} ${resolved.label} per user per month (${used} used). The limit resets on the 1st of next month (UTC).`,
      403
    );
  }
}

export async function recordContentUsage(
  ctx: ActivePlanContext,
  userId: string,
  type: ContentType,
  contentId: string,
  language?: ContentLanguage
): Promise<void> {
  const onInsert: Record<string, unknown> = { createdAt: new Date() };
  // Individual accounts have no company
  if (ctx.company?._id) onInsert.companyId = ctx.company._id;
  if (language) onInsert.language = language;

  await ContentUsage.updateOne(
    {
      userId: new Types.ObjectId(userId),
      contentType: type,
      contentId,
      period: currentPeriod(),
    },
    { $setOnInsert: onInsert },
    { upsert: true }
  );
}