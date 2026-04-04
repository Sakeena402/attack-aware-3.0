import { Router } from 'express';
import {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/companyController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const superAdminRouter = Router();

superAdminRouter.use(authenticate, requireSuperAdmin);

// Company Management
superAdminRouter.get('/companies', getAllCompanies);
superAdminRouter.post('/companies', createCompany);
superAdminRouter.get('/companies/:id', getCompany);
superAdminRouter.patch('/companies/:id', updateCompany);
superAdminRouter.put('/companies/:id', updateCompany);
superAdminRouter.delete('/companies/:id', deleteCompany);

// Global Analytics (no company filter)
superAdminRouter.get('/analytics/global', async (req, res) => {
  // This will be implemented in analytics controller
  res.json({ success: true, message: 'Global analytics endpoint' });
});

// Platform Users (all users)
superAdminRouter.get('/users', async (req, res) => {
  // This will be implemented in user controller
  res.json({ success: true, message: 'All users endpoint' });
});

// System Health
superAdminRouter.get('/system/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date(),
    },
  });
});

export default superAdminRouter;
