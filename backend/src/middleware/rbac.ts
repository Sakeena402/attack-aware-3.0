// backend/src/middleware/rbac.ts
import { Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest } from '../types/index.js';

/**
 * Authorize users by role.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError('Not authenticated', 401));

      if (!allowedRoles.includes(req.user.role)) {
        console.warn(`[rbac] ${req.user.email} (${req.user.role}) denied — needs ${allowedRoles.join(', ')}`);
        return next(new AppError(`Access denied. Requires role: ${allowedRoles.join(' or ')}`, 403));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Super admin only.
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    if (req.user.role !== 'super_admin') {
      console.warn(`[rbac] ${req.user.email} tried to access super admin resource`);
      return next(new AppError('Only super admins can access this resource', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Admin or super admin.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    if (!['admin', 'super_admin'].includes(req.user.role)) {
      console.warn(`[rbac] ${req.user.email} tried to access admin resource`);
      return next(new AppError('Only admins can access this resource', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Employee only.
 */
export const requireEmployee = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    if (req.user.role !== 'employee') {
      return next(new AppError('Only employees can access this resource', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * CRITICAL: Auto-filter queries by companyId to prevent cross-company data leaks.
 *
 * Sets req.companyFilter and/or req.userFilter — controllers read these
 * instead of trusting query params from the client.
 */
export const isolateByCompany = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    // Super admin sees everything — no filter applied
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Admin: scope to their company.
    // companyId missing means the admin account was created without one (e.g. during
    // onboarding). Return a clear error so it's easy to diagnose rather than silently
    // leaking data or returning an empty set.
    if (req.user.role === 'admin') {
      if (!req.user.companyId) {
        return next(new AppError(
          'Your account is not associated with a company. Please contact support.',
          403,
          'NO_COMPANY'
        ));
      }
      (req as any).companyFilter = { companyId: req.user.companyId };
      return next();
    }

    // Employee: scope to their company and user id
    if (req.user.role === 'employee') {
      if (!req.user.companyId) {
        return next(new AppError(
          'Your account is not associated with a company. Please contact support.',
          403,
          'NO_COMPANY'
        ));
      }
      (req as any).companyFilter = { companyId: req.user.companyId };
      (req as any).userFilter    = { userId: req.user.id };
      return next();
    }

    next(new AppError('Unknown role', 400, 'INVALID_REQUEST'));
  } catch (err) {
    next(err);
  }
};

/**
 * Check resource ownership. Employees can only access their own data;
 * admins can access anyone in their company; super admins have no restriction.
 */
export const checkOwnership = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError('Not authenticated', 401, ));

    if (req.user.role === 'super_admin') return next();
    if (req.user.role === 'admin')       return next(); // company scope enforced by isolateByCompany

    const targetUserId = req.params.userId || req.params.id;
    if (req.user.role === 'employee' && req.user.id !== targetUserId) {
      console.warn(`[rbac] ${req.user.email} tried to access another user's data`);
      return next(new AppError('You can only access your own data', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default { authorizeRoles, requireSuperAdmin, requireAdmin, requireEmployee, isolateByCompany, checkOwnership };

