// backend/src/routes/reports.ts (CREATE THIS FILE)
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, isolateByCompany } from '../middleware/rbac.js';
import {
  getAggregateReport,
  downloadCampaignPDF,
  downloadAggregatePDF,
} from '../controllers/campaignAnalyticsController.js';

const reportsRouter = Router();
reportsRouter.use(authenticate);

// Aggregate report data (JSON)
reportsRouter.get('/aggregate', requireAdmin, isolateByCompany, getAggregateReport);

// PDF downloads
reportsRouter.get('/campaign/:id/pdf', requireAdmin, downloadCampaignPDF);
reportsRouter.get('/aggregate/pdf',    requireAdmin, downloadAggregatePDF);

export default reportsRouter;