import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getTasks, createTask } from '../controllers/taskController.js';

const router = Router();
router.use(authenticate);
// Tasks are company-scoped. Individual users have no company context for task assignment.
router.use(authorizeRoles('admin', 'super_admin', 'employee'));
router.get('/', getTasks);
router.post('/', authorizeRoles('admin', 'super_admin'), createTask);

export default router;
