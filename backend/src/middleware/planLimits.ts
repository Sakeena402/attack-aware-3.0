// backend/src/middleware/planLimits.ts
// Route-level plan enforcement. Controllers are untouched.

import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import { Campaign } from '../models/Campaign.js';
import { User } from '../models/User.js';
import { Channel } from '../config/planLimits.js';
import { isPlanExempt } from '../config/planExemptions.js';
import {
  ActivePlanContext,
  getActivePlanContext,
  assertChannelAllowed,
  assertAiAllowed,
  assertAiQuizzesAllowed,
  assertMonthlyQuota,
  recordCampaignUsage,
} from '../services/planLimitsService.js';

const CHANNELS: Channel[] = ['phishing', 'smishing', 'vishing'];
const isChannel = (value: unknown): value is Channel => CHANNELS.includes(value as Channel);

function sendError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
  } else {
    console.error('[planLimits]', error);
    res.status(500).json({ success: false, error: fallback });
  }
}

// Quota is consumed only if the controller answers with a success status,
// so failed launches (e.g. "no targets") do not use up a monthly slot.
function recordUsageOnSuccess(
  res: Response,
  ctx: ActivePlanContext,
  channel: Channel,
  campaignId: string
): void {
  if (!ctx.limits) return;
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    recordCampaignUsage(ctx, channel, campaignId).catch((err) =>
      console.error('[planLimits] failed to record campaign usage:', err)
    );
  });
}

/** POST /employees — company approved, plan active, trial valid, seats not exceeded. */
export const enforceEmployeeSeatLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

    const ctx = await getActivePlanContext(req.user.companyId);

    const maxSeats = ctx.plan.maxEmployees;
    if (typeof maxSeats === 'number' && maxSeats >= 0) {
      // Every account in the company except the owner admin uses a seat.
      const used = await User.countDocuments({
        companyId: ctx.company._id,
        _id: { $ne: ctx.company.adminId },
      });
      if (used >= maxSeats) {
        throw new AppError(
          `Employee limit reached for your ${ctx.plan.name} plan (${used}/${maxSeats}). Please upgrade your plan to add more employees.`,
          403
        );
      }
    }

    next();
  } catch (error) {
    sendError(res, error, 'Plan check failed');
  }
};

/** POST /campaigns — company approved, plan active, channel included, AI template allowed. */
export const enforceCampaignCreate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

    const ctx = await getActivePlanContext(req.user.companyId);

    const type = req.body?.type;
    if (isChannel(type)) {
      assertChannelAllowed(ctx, type);
      if (req.body?.aiGeneratedTemplateId) assertAiAllowed(ctx, type);
    }

    next();
  } catch (error) {
    sendError(res, error, 'Plan check failed');
  }
};

/** POST /campaigns/:id/launch — channel + AI allowed and monthly quota not exceeded. */
export const enforceCampaignLaunch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next();

    const companyFilter = (req as any).companyFilter || {};
    const campaign: any = await Campaign.findOne({ _id: id, ...companyFilter })
      .select('type status aiGeneratedTemplateId')
      .lean();

    // Not found / already active → let the controller return its own 404 / 400
    if (!campaign || campaign.status === 'active') return next();

    const ctx = await getActivePlanContext(req.user.companyId);
    const channel = campaign.type as Channel;

    // AI templates can also be attached later through updateCampaign, so this is the real gate.
    if (campaign.aiGeneratedTemplateId) assertAiAllowed(ctx, channel);

    await assertMonthlyQuota(ctx, channel, id);
    recordUsageOnSuccess(res, ctx, channel, id);

    next();
  } catch (error) {
    sendError(res, error, 'Plan check failed');
  }
};

/**
 * /simulations/* send routes — plan rules (channel + monthly quota) plus a
 * company-ownership check. Exempt accounts skip the plan rules only; the
 * ownership check always runs so nobody can send against another company's campaign.
 */
export const enforceChannelSend = (channel: Channel) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      if (req.user.role === 'super_admin') return next();

      const exempt = isPlanExempt(req.user);

      let ctx: ActivePlanContext | null = null;
      if (!exempt) {
        ctx = await getActivePlanContext(req.user.companyId);
        assertChannelAllowed(ctx, channel);
      }

      const campaignId = req.params.campaignId || req.body?.campaignId;
      if (!campaignId || !mongoose.isValidObjectId(campaignId)) return next();

      const campaign: any = await Campaign.findById(campaignId).select('companyId').lean();
      if (!campaign) return next(); // controller returns its own 404

      if (String(campaign.companyId) !== String(req.user.companyId)) {
        throw new AppError("You can only send simulations for your own company's campaigns", 403);
      }

      if (ctx) {
        await assertMonthlyQuota(ctx, channel, String(campaignId));
        recordUsageOnSuccess(res, ctx, channel, String(campaignId));
      }

      next();
    } catch (error) {
      sendError(res, error, 'Plan check failed');
    }
  };
};

/** POST /ai/scenarios/generate — company approved, plan active, AI allowed for the requested channel. */
export const enforceAiScenarioGenerate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

    const ctx = await getActivePlanContext(req.user.companyId);

    // An invalid attackType falls through so the controller returns its own 400
    const type = req.body?.attackType;
    if (isChannel(type)) assertAiAllowed(ctx, type);

    next();
  } catch (error) {
    sendError(res, error, 'Plan check failed');
  }
};

/** AI quiz generation routes — company approved, plan active, `ai.quizzes` flag on. */
export const enforceAiQuizGenerate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) return next();

    const ctx = await getActivePlanContext(req.user.companyId);
    assertAiQuizzesAllowed(ctx);

    next();
  } catch (error) {
    sendError(res, error, 'Plan check failed');
  }
};