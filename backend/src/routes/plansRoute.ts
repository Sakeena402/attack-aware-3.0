import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getPlans, createPlan, subscribeToPlan } from '../controllers/planController.js';

const router = Router();
// All plan routes require auth
router.use(authenticate);

// Reading plans: any authenticated role
router.get('/', getPlans);

// Creating/modifying global plan catalog: super_admin ONLY
// (MembershipPlan has no companyId — it is a platform-wide catalog)
router.post('/', authorizeRoles('super_admin'), createPlan);

// A company admin or individual subscribes their company to a plan
// Individual needs this to subscribe before creating their own company
router.post('/subscribe', authorizeRoles('admin', 'super_admin', 'individual'), subscribeToPlan);

export default router;
