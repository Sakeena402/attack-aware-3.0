import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getVideos, createVideo, watchVideo } from '../controllers/videoController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getVideos);

// Creating global content library: super_admin ONLY (no companyId on Video model)
router.post('/', authorizeRoles('super_admin'), createVideo);

// Completion action: any authenticated user
router.post('/:id/watch', watchVideo);

export default router;
