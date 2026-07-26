import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { createCompanySelfService } from '../controllers/companyController.js';

const router = Router();

// All company routes require authentication
router.use(authenticate);

// Self-service company creation: individual role only
// This is the flow where someone registers as individual, subscribes to a plan,
// then creates their own company and automatically becomes its admin.
router.post('/', authorizeRoles('individual'), createCompanySelfService);

export default router;