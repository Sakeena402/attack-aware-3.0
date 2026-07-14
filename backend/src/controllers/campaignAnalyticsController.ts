
// backend/src/controllers/campaignAnalyticsController.ts (CREATE THIS FILE)
import { Response } from 'express';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import {
  getCampaignDetailedResults,
  compareCampaigns,
  getAggregateReportData,
} from '../services/campaignAnalyticsService.js';
import {
  generateCampaignPDF,
  generateAggregatePDF,
} from '../services/pdfReportService.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaigns/:id/results
// ─────────────────────────────────────────────────────────────────────────────
export const getCampaignResults = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const { id } = req.params;
    const data = await getCampaignDetailedResults(id);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: e.message ?? 'Failed to fetch campaign results',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/compare
// ─────────────────────────────────────────────────────────────────────────────
export const compareCampaignsController = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const { campaignIds } = req.body;
    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      throw new AppError('campaignIds array required', 400);
    }
    const data = await compareCampaigns(campaignIds);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: e.message ?? 'Failed to compare campaigns',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/aggregate
// ─────────────────────────────────────────────────────────────────────────────
export const getAggregateReport = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    // companyId: super_admin may pass via query; non-super_admin is always locked to their own company
    const companyId = req.user.role === 'super_admin'
      ? (req.query.companyId as string | undefined)
      : req.user.companyId;

    const { startDate, endDate, departments } = req.query as {
      startDate?: string;
      endDate?: string;
      departments?: string;
    };

    const data = await getAggregateReportData({
      companyId,
      startDate:   startDate ? new Date(startDate) : undefined,
      endDate:     endDate   ? new Date(endDate)   : undefined,
      departments: departments ? departments.split(',') : undefined,
    });

    res.json({ success: true, data });
  } catch (e: any) {
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: e.message ?? 'Failed to generate report',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/campaign/:id/pdf
// ─────────────────────────────────────────────────────────────────────────────
export const downloadCampaignPDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);
    const { id } = req.params;
    const pdfStream = await generateCampaignPDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-report.pdf"`);

    pdfStream.pipe(res);
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message ?? 'Failed to generate PDF',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/aggregate/pdf
// ─────────────────────────────────────────────────────────────────────────────
export const downloadAggregatePDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    // companyId: super_admin may pass via query; non-super_admin is always locked to their own company
    const companyId = req.user.role === 'super_admin'
      ? (req.query.companyId as string | undefined)
      : req.user.companyId;

    const { startDate, endDate, departments } = req.query as {
      startDate?: string;
      endDate?: string;
      departments?: string;
    };

    const pdfStream = await generateAggregatePDF({
      companyId,
      startDate:   startDate ? new Date(startDate) : undefined,
      endDate:     endDate   ? new Date(endDate)   : undefined,
      departments: departments ? departments.split(',') : undefined,
    });

    const filename = `aggregate-report-${startDate ?? 'all'}-${endDate ?? 'all'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfStream.pipe(res);
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message ?? 'Failed to generate PDF',
    });
  }
};