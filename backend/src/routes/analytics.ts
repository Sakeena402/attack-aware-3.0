import { Router } from 'express';
import {
  getCompanyAnalytics,
  getGlobalAnalytics,
  getDashboardStats,
  getSimulationAnalytics,
  getDepartmentRiskAnalysis,
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get('/dashboard', getDashboardStats);
analyticsRouter.get('/overview', getDashboardStats);
analyticsRouter.get('/company', getCompanyAnalytics);
analyticsRouter.get('/simulations', getSimulationAnalytics);
analyticsRouter.get('/department-risk', getDepartmentRiskAnalysis);
analyticsRouter.get('/global', authorize('super_admin'), getGlobalAnalytics);

export default analyticsRouter;
