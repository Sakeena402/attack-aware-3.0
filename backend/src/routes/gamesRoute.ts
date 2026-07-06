import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getGames, createGame, saveScore } from '../controllers/gameController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getGames);

// Creating global content library: super_admin ONLY (no companyId on Game model)
router.post('/', authorizeRoles('super_admin'), createGame);

// Completion action: any authenticated user
router.post('/:id/save-score', saveScore);

export default router;
