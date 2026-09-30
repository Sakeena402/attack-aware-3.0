import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import {
  getPlans,
  createPlan,
  subscribeToPlan,
  getMySubscriptionRequest,
  getMyIndividualPlan,
  getMyAllowance,
} from '../controllers/planController.js';

const router = Router();
router.use(authenticate);

router.get('/', getPlans);
router.post('/', authorizeRoles('super_admin'), createPlan);

// admin (company) or individual requests a plan → pending SubscriptionRequest, does not activate
router.post('/subscribe', authorizeRoles('admin', 'individual'), subscribeToPlan);

// admin or individual checks their own latest request
router.get('/subscribe/status', authorizeRoles('admin', 'individual'), getMySubscriptionRequest);

// individual: current plan
router.get('/my-plan', authorizeRoles('individual'), getMyIndividualPlan);

// any logged-in user: the monthly content allowance the UI should lock to
router.get('/my-allowance', getMyAllowance);

export default router;