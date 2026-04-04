
// backend/src/routes/employees.ts
import { Router } from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
} from '../controllers/employeeController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, isolateByCompany } from '../middleware/rbac.js';

const employeesRouter = Router();

employeesRouter.use(authenticate);

// Static routes MUST come before param routes — otherwise /:id captures "departments"
employeesRouter.get('/departments', isolateByCompany, getDepartments);

// Collection routes
employeesRouter.get('/',    isolateByCompany, getAllEmployees);
employeesRouter.post('/',   requireAdmin, isolateByCompany, createEmployee);

// Param routes last
employeesRouter.get('/:id',    isolateByCompany, getEmployeeById);
employeesRouter.put('/:id',    requireAdmin, isolateByCompany, updateEmployee);
employeesRouter.delete('/:id', requireAdmin, isolateByCompany, deleteEmployee);

export default employeesRouter;