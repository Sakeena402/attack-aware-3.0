import { Router } from 'express';
import { getCompanyAnalytics, getGlobalAnalytics, getDashboardStats } from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get('/dashboard', getDashboardStats);
analyticsRouter.get('/overview', getDashboardStats); // Alias for dashboard
analyticsRouter.get('/company', getCompanyAnalytics);
analyticsRouter.get('/global', authorize('super_admin'), getGlobalAnalytics);

export default analyticsRouter;
