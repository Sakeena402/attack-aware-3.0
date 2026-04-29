// backend/src/controllers/pdfReportController.ts
import { Response } from 'express';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest } from '../types/index.js';
import {
  generateCampaignPDF,
  generateAggregatePDF,
} from '../services/pdfReportService.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/campaign/:id/pdf
// Download single campaign report as PDF
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
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: e.message ?? 'Failed to generate PDF',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/aggregate/pdf
// Download aggregate report as PDF
// ─────────────────────────────────────────────────────────────────────────────
export const downloadAggregatePDF = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { companyId, startDate, endDate, departments } = req.query as {
      companyId?: string;
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
    res.status(e.statusCode ?? 500).json({
      success: false,
      error: e.message ?? 'Failed to generate PDF',
    });
  }
};