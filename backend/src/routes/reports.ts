// backend/src/routes/reports.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, isolateByCompany } from '../middleware/rbac.js';
import { requireFeature } from '../middleware/featureGating.js';
import {
  getAggregateReport,
  downloadCampaignPDF,
  downloadAggregatePDF,
} from '../controllers/campaignAnalyticsController.js';

const reportsRouter = Router();
reportsRouter.use(authenticate);

// Aggregate report data (JSON) — admin+, company-scoped
reportsRouter.get('/aggregate', requireAdmin, isolateByCompany, getAggregateReport);

// PDF downloads — admin+, company-scoped, gated behind 'PDF reports' plan feature
reportsRouter.get('/campaign/:id/pdf', requireAdmin, requireFeature('PDF reports'), downloadCampaignPDF);
reportsRouter.get('/aggregate/pdf',    requireAdmin, requireFeature('PDF reports'), downloadAggregatePDF);

export default reportsRouter;