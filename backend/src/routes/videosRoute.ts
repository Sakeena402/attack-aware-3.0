import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { enforceVideoWatch, enforceVideoStart } from '../middleware/contentLimits.js';
import { getVideos, createVideo, watchVideo, getMyWatchedVideos } from '../controllers/videoController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getVideos);

// Creating global content library: super_admin ONLY (no companyId on Video model)
router.post('/', authorizeRoles('super_admin'), createVideo);

// Check-only: the page calls this when it opens so a plan limit shows before the video plays
router.get('/:id/access', enforceVideoStart, (_req, res) => {
  res.json({ success: true, data: { allowed: true } });
});

// Completion action: any authenticated user
router.post('/:id/watch', enforceVideoWatch, watchVideo);

router.get('/me/completed', getMyWatchedVideos);

export default router;