// import { Router } from 'express';
// import {
//   getCompanyAnalytics,
//   getGlobalAnalytics,
//   getDashboardStats,
//   getSimulationAnalytics,
//   getDepartmentRiskAnalysis,
// } from '../controllers/analyticsController.js';
// import { authenticate } from '../middleware/auth.js';
// import { requireAdmin, requireSuperAdmin, isolateByCompany } from '../middleware/rbac.js';

// const analyticsRouter = Router();

// analyticsRouter.use(authenticate);

// // Admin analytics (company-specific)
// analyticsRouter.get('/dashboard', isolateByCompany, getDashboardStats);
// analyticsRouter.get('/overview', isolateByCompany, getDashboardStats);
// analyticsRouter.get('/company', requireAdmin, isolateByCompany, getCompanyAnalytics);
// analyticsRouter.get('/simulations', requireAdmin, isolateByCompany, getSimulationAnalytics);
// analyticsRouter.get('/department-risk', requireAdmin, isolateByCompany, getDepartmentRiskAnalysis);

// // Super Admin analytics (global)
// analyticsRouter.get('/global', requireSuperAdmin, getGlobalAnalytics);

// export default analyticsRouter;




// backend/src/routes/analytics.ts
import { Router } from 'express';
import {
  getDashboardStats,
  getSimulationAnalytics,
  getDepartmentRiskAnalysis,
  getUserAnalytics,
  getMyAnalytics,
  getCompanyAnalytics,
  getGlobalAnalytics,
} from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin, isolateByCompany } from '../middleware/rbac.js';
// import { requireFeature } from '../middleware/featureGating.js'; // removed: unused

const analyticsRouter = Router();
analyticsRouter.use(authenticate);

// ── Admin ─────────────────────────────────────────────────────────────────────
analyticsRouter.get('/dashboard',       isolateByCompany, getDashboardStats);
analyticsRouter.get('/overview',        isolateByCompany, getDashboardStats);       // alias — keeps existing callers working
analyticsRouter.get('/simulations',     requireAdmin, isolateByCompany, getSimulationAnalytics);
analyticsRouter.get('/department-risk', requireAdmin, isolateByCompany, getDepartmentRiskAnalysis);
analyticsRouter.get('/company',         requireAdmin, isolateByCompany, getCompanyAnalytics);

// ── User-level (employee sees own, admin sees any) ────────────────────────────
analyticsRouter.get('/me',              getMyAnalytics);
analyticsRouter.get('/user/:id',        getUserAnalytics);

// ── Super admin ───────────────────────────────────────────────────────────────
analyticsRouter.get('/global',          requireSuperAdmin, getGlobalAnalytics);

export default analyticsRouter;