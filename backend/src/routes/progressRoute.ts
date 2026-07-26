import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyProgress } from '../controllers/progressController.js';

const router = Router();
router.use(authenticate);

router.get('/me', getMyProgress);
router.get('/', getMyProgress);
router.get('/me', getMyProgress); // kept for backward compatibility

export default router;