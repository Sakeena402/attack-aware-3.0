// backend/src/services/planLimitsService.ts
// Shared plan checks: company approved, plan active, trial not expired, channel allowed, AI allowed, monthly quota.

import { Types } from 'mongoose';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';
import { CampaignUsage } from '../models/CampaignUsage.js';
import { AppError } from '../utils/errorHandler.js';
import { Channel, PlanLimits, getLimitsForPlan } from '../config/planLimits.js';
import { isPlanExempt } from '../config/planExemptions.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivePlanContext {
  company: any;
  plan: any;
  /** null = legacy plan that is not in config/planLimits.ts */
  limits: PlanLimits | null;
}

/** 'YYYY-MM' in UTC */
export function currentPeriod(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function assertTrialActive(company: any, plan: any): Promise<void> {
  if (plan.billing !== 'trial' || !plan.trialDays) return;

  // Trial starts when the super admin approved the subscription request
  const approval: any = await SubscriptionRequest.findOne({
    companyId: company._id,
    planId: plan._id,
    status: 'approved',
  })
    .sort({ reviewedAt: -1 })
    .lean();

  // Plan was assigned without a request → no start date to measure from
  if (!approval?.reviewedAt) return;

  const endsAt = new Date(new Date(approval.reviewedAt).getTime() + plan.trialDays * DAY_MS);
  if (Date.now() > endsAt.getTime()) {
    throw new AppError(
      `Your ${plan.trialDays}-day trial ended on ${endsAt.toISOString().slice(0, 10)}. Subscribe to a paid plan to continue.`,
      403
    );
  }
}

/**
 * Loads the company + plan and throws if the company is not approved,
 * has no plan, or its trial has expired.
 */
export async function getActivePlanContext(companyId: string | undefined): Promise<ActivePlanContext> {
  if (!companyId) {
    throw new AppError('Your account is not associated with a company', 403);
  }

  const company: any = await Company.findById(companyId).populate('subscriptionPlan').lean();
  if (!company) throw new AppError('Company not found', 404);

  if (company.approvalStatus !== 'approved') {
    throw new AppError('Your company must be approved before you can use this feature.', 403);
  }

  const plan = company.subscriptionPlan;
  if (!plan) {
    throw new AppError('Your company has no active plan. Subscribe to a plan to use this feature.', 403);
  }

  await assertTrialActive(company, plan);

  return { company, plan, limits: getLimitsForPlan(plan) };
}

/** True when the company's plan is defined in config/planLimits.ts */
export async function companyUsesPlanLimits(companyId: string | undefined): Promise<boolean> {
  if (!companyId) return false;
  const company: any = await Company.findById(companyId).populate('subscriptionPlan').lean();
  return !!getLimitsForPlan(company?.subscriptionPlan);
}

export function assertChannelAllowed(ctx: ActivePlanContext, channel: Channel): void {
  if (!ctx.limits) return; // legacy plan → old behaviour
  if (ctx.limits.campaignsPerMonth[channel] <= 0) {
    throw new AppError(
      `Your ${ctx.plan.name} plan does not include ${channel} campaigns. Upgrade your plan to use them.`,
      403
    );
  }
}

/** AI-generated scenarios are only available on plans whose `ai` flag is true for that channel. */
export function assertAiAllowed(ctx: ActivePlanContext, channel: Channel): void {
  if (!ctx.limits) return; // legacy plan → old behaviour
  if (!ctx.limits.ai[channel]) {
    throw new AppError(
      `Your ${ctx.plan.name} plan does not include AI-generated ${channel} scenarios. Upgrade your plan to use them.`,
      403
    );
  }
}

/** AI-generated quizzes are only available on plans whose `ai.quizzes` flag is true. */
export function assertAiQuizzesAllowed(ctx: ActivePlanContext): void {
  if (!ctx.limits) return; // legacy plan → old behaviour
  if (!ctx.limits.ai.quizzes) {
    throw new AppError(
      `Your ${ctx.plan.name} plan does not include AI-generated quizzes. Upgrade your plan to use them.`,
      403
    );
  }
}

/**
 * Non-throwing version for background jobs (monthly scheduler, adaptive quizzes)
 * that have no request/user to reply to. Returns false when the company is
 * missing, not approved, has no plan, its trial expired, or the plan's
 * `ai.quizzes` flag is off. A company whose owner admin is plan-exempt always
 * returns true, matching the on-demand routes.
 */
export async function companyAllowsAiQuizzes(
  companyId: string | Types.ObjectId | undefined | null
): Promise<boolean> {
  if (!companyId) return false;
  const id = String(companyId);

  const owner: any = await Company.findById(id).select('adminId').lean();
  if (owner?.adminId) {
    const admin = await User.findById(owner.adminId).select('email').lean();
    if (isPlanExempt(admin as { email?: string } | null)) return true;
  }

  try {
    const ctx = await getActivePlanContext(id);
    if (!ctx.limits) return true; // legacy plan → old behaviour
    return ctx.limits.ai.quizzes;
  } catch {
    return false;
  }
}

export async function assertMonthlyQuota(
  ctx: ActivePlanContext,
  channel: Channel,
  campaignId?: string
): Promise<void> {
  if (!ctx.limits) return; // legacy plan → old behaviour

  assertChannelAllowed(ctx, channel);

  const quota = ctx.limits.campaignsPerMonth[channel];
  const period = currentPeriod();

  // A campaign already counted this month can be relaunched / resent for free
  if (campaignId) {
    const alreadyCounted = await CampaignUsage.exists({
      companyId: ctx.company._id,
      campaignId: new Types.ObjectId(campaignId),
      channel,
      period,
    });
    if (alreadyCounted) return;
  }

  const used = await CampaignUsage.countDocuments({
    companyId: ctx.company._id,
    channel,
    period,
  });

  if (used >= quota) {
    throw new AppError(
      `Monthly limit reached: your ${ctx.plan.name} plan includes ${quota} ${channel} campaign${quota === 1 ? '' : 's'} per month (${used} used). The limit resets on the 1st of next month (UTC).`,
      403
    );
  }
}

export async function recordCampaignUsage(
  ctx: ActivePlanContext,
  channel: Channel,
  campaignId: string
): Promise<void> {
  await CampaignUsage.updateOne(
    {
      companyId: ctx.company._id,
      campaignId: new Types.ObjectId(campaignId),
      channel,
      period: currentPeriod(),
    },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}