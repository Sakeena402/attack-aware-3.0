import { Response } from 'express';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import {
  computeDashboardStats,
  computeSimulationAnalytics,
  computeDepartmentRisk,
  computeUserAnalytics,
} from '../services/analyticsService.js';

// Resolve companyId based on role
function resolveCompanyId(req: AuthRequest): string | undefined {
  if (req.user?.role === 'super_admin') {
    return (req.query.companyId as string) || undefined;
  }
  return req.user?.companyId;
}

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const period = req.query.period as string | undefined;  // ✅ read period
    const data   = await computeDashboardStats(resolveCompanyId(req), period); // ✅ pass period
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message ?? 'Failed' });
  }
};

export const getSimulationAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const period = req.query.period as string | undefined;  // ✅ read period
    const data   = await computeSimulationAnalytics(resolveCompanyId(req), period); // ✅ pass period
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message ?? 'Failed' });
  }
};

export const getDepartmentRiskAnalysis = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const period = req.query.period as string | undefined;  // ✅ read period
    const data   = await computeDepartmentRisk(resolveCompanyId(req), period); // ✅ pass period
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message ?? 'Failed' });
  }
};

export const getUserAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const targetId = req.params.id ?? req.user.id;
    if (req.user.role === 'employee' && targetId !== req.user.id) {
      throw new AppError('Access denied', 403);
    }
    const data = await computeUserAnalytics(targetId, resolveCompanyId(req));
    if (!data) throw new AppError('User not found', 404);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({ success: false, error: e.message ?? 'Failed' });
  }
};

export const getMyAnalytics = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  req.params.id = req.user!.id;
  return getUserAnalytics(req, res);
};

export const getCompanyAnalytics = getDashboardStats;
export const getGlobalAnalytics  = getDashboardStats;