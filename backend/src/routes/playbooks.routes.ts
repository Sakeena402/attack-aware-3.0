// backend/src/routes/playbooks.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listPlaybooksHandler,
  getPlaybookHandler,
  updatePlaybookHandler,
  approvePlaybookHandler,
  rejectPlaybookHandler,
  generatePlaybookHandler,
} from '../controllers/playbookController.js';

const router = Router();

// All roles may read (employees need read access too)
router.use(authenticate);

router.get('/', listPlaybooksHandler);

// Must be registered BEFORE '/:id' routes
// Company admins only: generates a draft playbook for their own company
router.post('/generate', authorize('admin'), generatePlaybookHandler);

router.get('/:id', getPlaybookHandler);

// Review actions: admin / super_admin only
router.patch('/:id', authorize('admin', 'super_admin'), updatePlaybookHandler);
router.post('/:id/approve', authorize('admin', 'super_admin'), approvePlaybookHandler);
router.post('/:id/reject', authorize('admin', 'super_admin'), rejectPlaybookHandler);

export default router;