import { Router } from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
} from '../controllers/employeeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const employeesRouter = Router();

employeesRouter.use(authenticate);

// Get all departments (for filtering)
employeesRouter.get('/departments', getDepartments);

// CRUD operations
employeesRouter.get('/', getAllEmployees);
employeesRouter.get('/:id', getEmployeeById);
employeesRouter.post('/', authorize('admin', 'super_admin'), createEmployee);
employeesRouter.put('/:id', authorize('admin', 'super_admin'), updateEmployee);
employeesRouter.delete('/:id', authorize('admin', 'super_admin'), deleteEmployee);

export default employeesRouter;
