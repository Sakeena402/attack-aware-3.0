import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';
import { isPlanExempt } from '../config/planExemptions.js';
import { ActivePlanContext, getActivePlanContext } from '../services/planLimitsService.js';
import { getIndividualPlanContext } from '../services/contentLimitsService.js';

function toFrontendShape(plan: any) {
  return {
    id: plan.planId,
    category: plan.category,
    name: plan.name,
    seats: plan.seats,
    priceUSD: plan.priceUSD,
    priceUSDPerUser: plan.priceUSDPerUser,
    priceRs: plan.priceRs,
    billing: plan.billing,
    trialDays: plan.trialDays,
    description: plan.description,
    features: plan.features,
    highlight: plan.highlight,
  };
}

function toAllowance(c: { videosEn: number; videosUr: number; games: number; quizzesEn: number; quizzesUr: number }) {
  return {
    videosEn: c.videosEn,
    videosUr: c.videosUr,
    games: c.games,
    quizzes: Math.max(c.quizzesEn, c.quizzesUr),
  };
}

function sendError(res: Response<ApiResponse>, e: any) {
  if (e instanceof AppError) res.status(e.statusCode).json({ success: false, error: e.message });
  else res.status(500).json({ success: false, error: e.message });
}

export const getPlans = async (_req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true }).sort({ category: 1, priceUSD: 1 }).lean();
    res.json({ success: true, data: plans.map(toFrontendShape) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// super_admin only — manage the platform-wide catalog directly
export const createPlan = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const body = req.body;
    if (!body.planId || !body.category || !body.billing) {
      throw new AppError('planId, category, and billing are required', 400);
    }
    const plan = await MembershipPlan.create({
      ...body,
      maxEmployees: body.seats, // keep employeeController's field in sync
    });
    res.status(201).json({ success: true, data: plan });
  } catch (e: any) {
    sendError(res, e);
  }
};

// Individual user requests a plan for themselves — PENDING only, super admin approves.
async function createIndividualRequest(req: AuthRequest, res: Response<ApiResponse>, planId: string) {
  const plan: any = await MembershipPlan.findOne({ planId, isActive: true });
  if (!plan) throw new AppError('Plan not found', 404);
  if (plan.category !== 'individual') {
    throw new AppError('Individual accounts can only request individual plans', 400);
  }

  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError('User not found', 404);

  // A user with no plan set is treated as being on Basic
  if ((user.subscriptionPlan || 'ind-basic') === plan.planId) {
    throw new AppError('You are already on this plan', 400);
  }

  const existingPending = await SubscriptionRequest.findOne({ userId: user._id, status: 'pending' });
  if (existingPending) {
    throw new AppError('You already have a pending subscription request', 400);
  }

  const request = await SubscriptionRequest.create({
    userId: user._id,
    planId: plan._id,
    requestedBy: user._id,
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: { request, message: 'Plan request submitted. Awaiting approval.' },
  });
}

// Admin (company) or individual requests a plan — creates a PENDING request only.
// Does NOT activate the plan. Super admin must approve it separately.
export const subscribeToPlan = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { planId } = req.body as { planId: string }; // frontend slug, e.g. "ent-advanced"
    if (!planId) throw new AppError('planId is required', 400);

    if (req.user.role === 'individual') {
      await createIndividualRequest(req, res, planId);
      return;
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Only company admins and individual users can request a plan', 403);
    }
    if (!req.user.companyId) {
      throw new AppError('Your account is not associated with a company', 400);
    }

    const company = await Company.findById(req.user.companyId);
    if (!company) throw new AppError('Company not found', 404);

    // ── Amendment 1: company legitimacy gate, separate from plan approval ──
    if (company.approvalStatus !== 'approved') {
      throw new AppError('Your company must be approved before requesting a plan', 403);
    }

    const plan = await MembershipPlan.findOne({ planId, isActive: true });
    if (!plan) throw new AppError('Plan not found', 404);
    if ((plan as any).category !== 'enterprise') {
      throw new AppError('Companies can only request enterprise plans', 400);
    }

    const existingPending = await SubscriptionRequest.findOne({
      companyId: company._id,
      status: 'pending',
    });
    if (existingPending) {
      throw new AppError('You already have a pending subscription request', 400);
    }

    const request = await SubscriptionRequest.create({
      companyId: company._id,
      planId: plan._id,
      requestedBy: req.user.id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: { request, message: 'Subscription request submitted. Awaiting approval.' },
    });
  } catch (e: any) {
    sendError(res, e);
  }
};

export const getMySubscriptionRequest = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    if (req.user.role === 'individual') {
      const request = await SubscriptionRequest.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .populate('planId');
      res.json({ success: true, data: request });
      return;
    }

    if (!req.user.companyId) throw new AppError('Your account is not associated with a company', 400);

    const request = await SubscriptionRequest.findOne({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .populate('planId');

    res.json({ success: true, data: request });
  } catch (e: any) {
    sendError(res, e);
  }
};

// Individual: which plan am I on right now? Empty means Basic.
// Also returns the monthly content allowance the backend enforces.
export const getMyIndividualPlan = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const user: any = await User.findById(req.user.id).select('subscriptionPlan').lean();
    const planId: string = user?.subscriptionPlan || 'ind-basic';
    const plan = await MembershipPlan.findOne({ planId, isActive: true }).lean();

    const ctx = await getIndividualPlanContext(req.user.id);
    const c = ctx.limits?.content;

    res.json({
      success: true,
      data: { planId, plan: plan ? toFrontendShape(plan) : null, allowance: c ? toAllowance(c) : null },
    });
  } catch (e: any) {
    sendError(res, e);
  }
};

// Any logged-in user: the monthly video / game / quiz allowance the UI should lock to.
// allowance is null when the user is not limited (super_admin, plan-exempt account)
// or has no usable plan (the backend still blocks completions with a clear message).
export const getMyAllowance = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    if (req.user.role === 'super_admin' || isPlanExempt(req.user)) {
      res.json({ success: true, data: { allowance: null } });
      return;
    }

    let ctx: ActivePlanContext | null = null;
    if (req.user.companyId) {
      ctx = await getActivePlanContext(req.user.companyId).catch(() => null);
    } else if (req.user.role === 'individual') {
      ctx = await getIndividualPlanContext(req.user.id);
    }

    const c = ctx?.limits?.content;
    res.json({ success: true, data: { allowance: c ? toAllowance(c) : null } });
  } catch (e: any) {
    sendError(res, e);
  }
};