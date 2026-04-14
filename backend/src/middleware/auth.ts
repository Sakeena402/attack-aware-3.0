import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt.js';
import { AppError, ErrorCodes } from '../utils/errorHandler.js';
import { AuthRequest, UserRole } from '../types/index.js';
import { logAuth, logSecurity } from '../utils/logger.js';


// JWT Error types
interface JWTError extends Error {
  name: 'TokenExpiredError' | 'JsonWebTokenError' | 'NotBeforeError';
  expiredAt?: Date;
}

// Extract token from request
// const extractToken = (req: AuthRequest): string | null => {
//   // Check Authorization header first
//   const authHeader = req.headers.authorization;
//   if (authHeader && authHeader.startsWith('Bearer ')) {
//     return authHeader.substring(7);
//   }
  
//   // Check cookies as fallback
//   if (req.cookies?.token) {
//     return req.cookies.token;
//   }
  
//   // Check query param for special cases (webhooks, etc.)
//   if (req.query.token && typeof req.query.token === 'string') {
//     return req.query.token;
//   }
  
//   return null;
// };

const extractToken = (req: AuthRequest): string | null => {
  // ✅ 1. Check Authorization header (frontend)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // ✅ 2. Check cookies (optional)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

// Main authentication middleware
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
        reason: 'No token provided',
      });
      throw new AppError('Authentication required. Please provide a valid token.', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      logSecurity('invalid_token', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
        reason: 'Token verification failed',
      });
      throw new AppError('Invalid or expired token. Please login again.', 401, ErrorCodes.TOKEN_INVALID);
    }

    // Attach user to request
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      logAuth('failed_login', null, 'unknown', false, req.requestId || 'unknown', 'Token expired');
      res.status(401).json({
        success: false,
        error: 'Your session has expired. Please login again.',
        errorCode: ErrorCodes.TOKEN_EXPIRED,
        requestId: req.requestId,
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logSecurity('invalid_token', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
        reason: error.message,
      });
      res.status(401).json({
        success: false,
        error: 'Invalid authentication token. Please login again.',
        errorCode: ErrorCodes.TOKEN_INVALID,
        requestId: req.requestId,
      });
      return;
    }

    if (error instanceof jwt.NotBeforeError) {
      res.status(401).json({
        success: false,
        error: 'Token is not yet valid.',
        errorCode: ErrorCodes.TOKEN_INVALID,
        requestId: req.requestId,
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode,
        requestId: req.requestId,
      });
      return;
    }

    // Unknown error
    res.status(401).json({
      success: false,
      error: 'Authentication failed. Please try again.',
      errorCode: ErrorCodes.UNAUTHORIZED,
      requestId: req.requestId,
    });
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
          reason: 'No user in request',
        });
        throw new AppError('Authentication required before authorization.', 401, ErrorCodes.UNAUTHORIZED);
      }

      if (!allowedRoles.includes(req.user.role)) {
        logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
          reason: 'Insufficient permissions',
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          userId: req.user.id,
        });
        throw new AppError(
          `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
          403,
          ErrorCodes.FORBIDDEN
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          requestId: req.requestId,
        });
      } else {
        res.status(403).json({
          success: false,
          error: 'Authorization failed.',
          errorCode: ErrorCodes.FORBIDDEN,
          requestId: req.requestId,
        });
      }
    }
  };
};

// Optional authentication - doesn't fail if no token, just attaches user if present
export const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        req.user = {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          companyId: payload.companyId,
        };
      }
    }
    
    next();
  } catch {
    // Silently continue without user
    next();
  }
};

// Check if user is accessing their own resource or is admin
export const authorizeOwnerOrAdmin = (
  userIdParam: string = 'id'
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      const resourceUserId = req.params[userIdParam];
      const isOwner = req.user.id === resourceUserId;
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
          reason: 'Not owner or admin',
          userId: req.user.id,
          resourceUserId,
        });
        throw new AppError('You can only access your own resources.', 403, ErrorCodes.FORBIDDEN);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          requestId: req.requestId,
        });
      } else {
        res.status(403).json({
          success: false,
          error: 'Authorization failed.',
          errorCode: ErrorCodes.FORBIDDEN,
          requestId: req.requestId,
        });
      }
    }
  };
};

// Company access middleware - ensures user can only access their company's data
export const authorizeCompanyAccess = (
  companyIdSource: 'params' | 'query' | 'body' = 'query',
  companyIdField: string = 'companyId'
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
      }

      // Super admins can access any company
      if (req.user.role === 'super_admin') {
        next();
        return;
      }

      // Get requested company ID
      let requestedCompanyId: string | undefined;
      if (companyIdSource === 'params') {
        requestedCompanyId = req.params[companyIdField];
      } else if (companyIdSource === 'query') {
        requestedCompanyId = req.query[companyIdField] as string;
      } else if (companyIdSource === 'body') {
        requestedCompanyId = req.body[companyIdField];
      }

      // If no company specified, use user's company
      if (!requestedCompanyId) {
        if (companyIdSource === 'query') {
          req.query[companyIdField] = req.user.companyId;
        }
        next();
        return;
      }

      // Check if user belongs to the requested company
      if (req.user.companyId && req.user.companyId !== requestedCompanyId) {
        logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
          reason: 'Cross-company access attempt',
          userId: req.user.id,
          userCompanyId: req.user.companyId,
          requestedCompanyId,
        });
        throw new AppError('You can only access resources within your company.', 403, ErrorCodes.FORBIDDEN);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          errorCode: error.errorCode,
          requestId: req.requestId,
        });
      } else {
        res.status(403).json({
          success: false,
          error: 'Company authorization failed.',
          errorCode: ErrorCodes.FORBIDDEN,
          requestId: req.requestId,
        });
      }
    }
  };
};

// Super admin only middleware
export const superAdminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 401, ErrorCodes.UNAUTHORIZED);
    }

    if (req.user.role !== 'super_admin') {
      logSecurity('unauthorized_access', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
        reason: 'Super admin access required',
        userId: req.user.id,
        userRole: req.user.role,
      });
      throw new AppError('This action requires super administrator privileges.', 403, ErrorCodes.FORBIDDEN);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        errorCode: error.errorCode,
        requestId: req.requestId,
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Super admin authorization failed.',
        errorCode: ErrorCodes.FORBIDDEN,
        requestId: req.requestId,
      });
    }
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth,
  authorizeOwnerOrAdmin,
  authorizeCompanyAccess,
  superAdminOnly,
};
