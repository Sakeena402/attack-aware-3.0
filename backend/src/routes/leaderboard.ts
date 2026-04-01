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
import { authenticate, authorize } from '../middleware/auth.js';

const leaderboardRouter = Router();

leaderboardRouter.use(authenticate);

// General leaderboard (query params for companyId and department)
leaderboardRouter.get('/', getLeaderboardGeneral);

// Department and user-specific endpoints
leaderboardRouter.get('/department/:department', getLeaderboardByDepartment);
leaderboardRouter.get('/user/:userId', getUserRank);

// Company-specific endpoints
leaderboardRouter.post('/:companyId', authorize('admin', 'super_admin'), updateLeaderboard);
leaderboardRouter.get('/:companyId', getLeaderboard);
leaderboardRouter.get('/:companyId/top', getTopPerformers);
leaderboardRouter.get('/:companyId/departments', getDepartmentRanking);

export default leaderboardRouter;
