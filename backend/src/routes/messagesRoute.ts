import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getMessages, sendMessage } from '../controllers/messageController.js';

const router = Router();
router.use(authenticate);
// Messaging is company-scoped. Individual users (no company) are excluded.
router.use(authorizeRoles('admin', 'super_admin', 'employee'));
router.get('/', getMessages);
router.post('/', sendMessage);

export default router;
