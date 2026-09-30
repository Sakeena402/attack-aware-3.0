import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { sendNotificationEmail } from '../services/emailService.js';

export const listSubscriptionRequests = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const requests = await SubscriptionRequest.find(filter)
      .populate('companyId', 'companyName industry approvalStatus')
      .populate('userId', 'name email')
      .populate('planId', 'name category priceUSD')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: requests });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const approveSubscriptionRequest = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { id } = req.params;
    const request = await SubscriptionRequest.findById(id).populate('planId');
    if (!request) throw new AppError('Subscription request not found', 404);
    if (request.status !== 'pending') {
      throw new AppError(`Request is already ${request.status}`, 400);
    }

    request.status = 'approved';
    request.reviewedBy = req.user.id as any;
    request.reviewedAt = new Date();
    await request.save();

    // this is the actual activation step
    if (request.companyId) {
      await Company.findByIdAndUpdate(request.companyId, {
        subscriptionPlan: request.planId,
      });
    } else if (request.userId) {
      // individual: User.subscriptionPlan stores the plan slug, e.g. "ind-premium"
      const plan = request.planId as any;
      await User.findByIdAndUpdate(request.userId, { subscriptionPlan: plan.planId });
    }

    const requester = await User.findById(request.requestedBy);
    if (requester) {
      const plan = request.planId as any;
      await sendNotificationEmail({
        to: requester.email,
        subject: 'Your AttackAware plan has been approved',
        html: `<p>Hi ${requester.name},</p><p>Your subscription to the <strong>${plan.name}</strong> plan has been approved and is now active.</p>`,
      });
    }

    res.json({ success: true, data: request });
  } catch (e: any) {
    if (e instanceof AppError) res.status(e.statusCode).json({ success: false, error: e.message });
    else res.status(500).json({ success: false, error: e.message });
  }
};

export const rejectSubscriptionRequest = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { id } = req.params;
    const { rejectionNote } = req.body as { rejectionNote?: string };

    const request = await SubscriptionRequest.findById(id).populate('planId');
    if (!request) throw new AppError('Subscription request not found', 404);
    if (request.status !== 'pending') {
      throw new AppError(`Request is already ${request.status}`, 400);
    }

    request.status = 'rejected';
    request.reviewedBy = req.user.id as any;
    request.reviewedAt = new Date();
    if (rejectionNote) request.rejectionNote = rejectionNote;
    await request.save();

    const requester = await User.findById(request.requestedBy);
    if (requester) {
      const plan = request.planId as any;
      await sendNotificationEmail({
        to: requester.email,
        subject: 'Your AttackAware plan request was not approved',
        html: `<p>Hi ${requester.name},</p><p>Your request for the <strong>${plan.name}</strong> plan was not approved${rejectionNote ? `: ${rejectionNote}` : '.'}</p><p>You're welcome to submit a new request at any time.</p>`,
      });
    }

    res.json({ success: true, data: request });
  } catch (e: any) {
    if (e instanceof AppError) res.status(e.statusCode).json({ success: false, error: e.message });
    else res.status(500).json({ success: false, error: e.message });
  }
};