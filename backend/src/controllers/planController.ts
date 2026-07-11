import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { MembershipPlan } from '../models/MembershipPlan.js';
import { Company } from '../models/Company.js';

export const getPlans = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const plans = await MembershipPlan.find();
    res.json({ success: true, data: plans });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const createPlan = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const plan = await MembershipPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const subscribeToPlan = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { planId, companyId } = req.body;
    await Company.findByIdAndUpdate(companyId, { subscriptionPlan: planId });
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};
