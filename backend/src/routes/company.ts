import { Router } from 'express';
import {
  createCompany,
  getCompany,
  updateCompany,
  getAllCompanies,
  deleteCompany,
} from '../controllers/companyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const companyRouter = Router();

companyRouter.use(authenticate);

companyRouter.post('/', authorize('admin', 'super_admin'), createCompany);
companyRouter.get('/', getAllCompanies);
companyRouter.get('/:id', getCompany);
companyRouter.patch('/:id', authorize('admin', 'super_admin'), updateCompany);
companyRouter.delete('/:id', authorize('super_admin'), deleteCompany);

export default companyRouter;
