// backend/src/routes/leaderboard.ts
import { Router } from 'express';
import {
  updateLeaderboard,
  getLeaderboard,
  getLeaderboardGeneral,
  getLeaderboardByDepartment,
  getUserRank,
  getTopPerformers,
  getDepartmentRanking,
} from '../controllers/leaderboardController.js';
import { authenticate } from '../middleware/auth.js';
import {
  requireAdmin,
  isolateByCompany,
  checkOwnership,
} from '../middleware/rbac.js';

const leaderboardRouter = Router();

leaderboardRouter.use(authenticate);

// Static routes FIRST — before any /:param routes
leaderboardRouter.get('/',                         isolateByCompany, getLeaderboardGeneral);
leaderboardRouter.get('/user/:userId',             checkOwnership,   getUserRank);
leaderboardRouter.get('/department/:department',   requireAdmin, isolateByCompany, getLeaderboardByDepartment);

// Param routes LAST
leaderboardRouter.post('/:companyId',              requireAdmin, isolateByCompany, updateLeaderboard);
leaderboardRouter.get('/:companyId',               requireAdmin, isolateByCompany, getLeaderboard);
leaderboardRouter.get('/:companyId/top',           requireAdmin, isolateByCompany, getTopPerformers);
leaderboardRouter.get('/:companyId/departments',   requireAdmin, isolateByCompany, getDepartmentRanking);

export default leaderboardRouter;