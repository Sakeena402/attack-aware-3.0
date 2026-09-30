import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles, requireSuperAdmin } from '../middleware/rbac.js';
import {
  createCompanySelfService,
  getMyCompany,
  updateMyCompany,
  getCompaniesForReview,
  updateCompanyApprovalStatus,
} from '../controllers/companyController.js';

const router = Router();
router.use(authenticate);

// Self-service: individual creates their own company, becomes admin
router.post('/', authorizeRoles('individual'), createCompanySelfService);

// Admin: view/update their own company profile
router.get('/me', authorizeRoles('admin'), getMyCompany);
router.patch('/me', authorizeRoles('admin'), updateMyCompany);

// Super-admin: review queue for enterprise-requests page
router.get('/', requireSuperAdmin, getCompaniesForReview);
router.patch('/:id', requireSuperAdmin, updateCompanyApprovalStatus);

export default router;