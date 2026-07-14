import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProgress } from '../controllers/progressController.js';

const router = Router();

router.get('/', authenticate, getProgress);

export default router;
