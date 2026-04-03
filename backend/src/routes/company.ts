import { Router } from 'express';
import {
  createCompany,
  getCompany,
  updateCompany,
  getAllCompanies,
  deleteCompany,
} from '../controllers/companyController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const companyRouter = Router();

companyRouter.use(authenticate);

// Super Admin only routes
companyRouter.post('/', requireSuperAdmin, createCompany);
companyRouter.get('/', requireSuperAdmin, getAllCompanies);
companyRouter.get('/:id', requireSuperAdmin, getCompany);
companyRouter.patch('/:id', requireSuperAdmin, updateCompany);
companyRouter.put('/:id', requireSuperAdmin, updateCompany);
companyRouter.delete('/:id', requireSuperAdmin, deleteCompany);

export default companyRouter;
