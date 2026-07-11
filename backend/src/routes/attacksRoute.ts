import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getAttacks, createAttack } from '../controllers/attackController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getAttacks);

// Creating global content library: super_admin ONLY (no companyId on Attack model)
router.post('/', authorizeRoles('super_admin'), createAttack);

export default router;
