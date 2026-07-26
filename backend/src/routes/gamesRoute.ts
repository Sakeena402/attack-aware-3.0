import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getGames, getGameById, createGame, saveScore } from '../controllers/gameController.js';

const router = Router();
router.use(authenticate);

router.get('/', getGames);
router.get('/:id', getGameById);
router.post('/', authorizeRoles('super_admin'), createGame);
router.post('/:id/save-score', saveScore);

export default router;