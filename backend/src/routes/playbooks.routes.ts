// backend/src/routes/playbooks.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listPlaybooksHandler,
  getPlaybookHandler,
  updatePlaybookHandler,
  approvePlaybookHandler,
  rejectPlaybookHandler,
} from '../controllers/playbookController.js';

const router = Router();

// All roles may read (employees need read access too)
router.use(authenticate);

router.get('/', listPlaybooksHandler);
router.get('/:id', getPlaybookHandler);

// Review actions: admin / super_admin only
router.patch('/:id', authorize('admin', 'super_admin'), updatePlaybookHandler);
router.post('/:id/approve', authorize('admin', 'super_admin'), approvePlaybookHandler);
router.post('/:id/reject', authorize('admin', 'super_admin'), rejectPlaybookHandler);

// POST /generate is added in Step 3b (AI service)

export default router;