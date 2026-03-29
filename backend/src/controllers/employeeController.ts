import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';

export const getAllEmployees = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId, department, search, limit = '50', page = '1' } = req.query as {
      companyId?: string;
      department?: string;
      search?: string;
      limit?: string;
      page?: string;
    };

    const query: Record<string, unknown> = {};
    
    // Filter by company
    if (companyId) {
      query.companyId = companyId;
    } else if (req.user.role !== 'super_admin' && req.user.companyId) {
      query.companyId = req.user.companyId;
    }

    // Filter by department
    if (department) {
      query.department = department;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch employees' });
    }
  }
};

export const getEmployeeById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const employee = await User.findById(id).select('-passwordHash').lean();

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check if user has access to this employee
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch employee' });
    }
  }
};

export const createEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { name, email, password, department, role = 'employee', companyId } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    // Determine company ID
    const employeeCompanyId = companyId || req.user.companyId;

    if (!employeeCompanyId && req.user.role !== 'super_admin') {
      throw new AppError('Company ID is required', 400);
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    const newEmployee = new User({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      department: department || 'General',
      role,
      companyId: employeeCompanyId,
      points: 0,
      badge: 'Rookie',
    });

    await newEmployee.save();

    const employeeResponse = newEmployee.toObject();
    delete (employeeResponse as Record<string, unknown>).passwordHash;

    res.status(201).json({
      success: true,
      data: employeeResponse,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create employee' });
    }
  }
};

export const updateEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { name, email, department, role, points, badge, password } = req.body;

    const employee = await User.findById(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check access
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Update fields
    if (name) employee.name = name;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existingUser) {
        throw new AppError('Email already exists', 409);
      }
      employee.email = email.toLowerCase().trim();
    }
    if (department) employee.department = department;
    if (role && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
      employee.role = role;
    }
    if (typeof points === 'number') employee.points = points;
    if (badge) employee.badge = badge;
    if (password) {
      employee.passwordHash = await bcryptjs.hash(password, 10);
    }

    await employee.save();

    const employeeResponse = employee.toObject();
    delete (employeeResponse as Record<string, unknown>).passwordHash;

    res.json({
      success: true,
      data: employeeResponse,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update employee' });
    }
  }
};

export const deleteEmployee = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    const employee = await User.findById(id);

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check access
    if (req.user.role !== 'super_admin' && req.user.companyId !== employee.companyId?.toString()) {
      throw new AppError('Access denied', 403);
    }

    // Prevent deleting yourself
    if (employee._id.toString() === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      data: { message: 'Employee deleted successfully' },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete employee' });
    }
  }
};

export const getDepartments = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query as { companyId?: string };
    const targetCompanyId = companyId || req.user.companyId;

    const query = targetCompanyId ? { companyId: targetCompanyId } : {};
    const departments = await User.distinct('department', query);

    res.json({
      success: true,
      data: departments.filter(Boolean),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
  }
};
