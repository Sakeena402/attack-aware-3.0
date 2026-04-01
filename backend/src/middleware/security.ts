import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorCodes } from '../utils/errorHandler.js';
import logger, { logSecurity } from '../utils/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// Request ID middleware - attach unique ID to every request
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Request timing middleware
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    logger.http('Request completed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      requestId: req.requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });
  next();
};

// Helmet security headers configuration
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// XSS protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  // Sanitize query params
  if (req.query) {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }
  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }
  next();
};

// Helper function to sanitize objects recursively
function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    // Remove potential XSS patterns
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/<[^>]*>/g, '') as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }
  
  return obj;
}

// MongoDB query sanitization
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logSecurity('suspicious_activity', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
      reason: 'NoSQL injection attempt',
      field: key,
    });
  },
});

// General rate limiter
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res, _next, options) => {
    logSecurity('rate_limit', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
      limit: options.max,
      windowMs: options.windowMs,
    });
    res.status(429).json(options.message);
  },
});

// Strict rate limiter for auth routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
    errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res, _next, options) => {
    logSecurity('rate_limit', req.ip || 'unknown', req.path, req.requestId || 'unknown', {
      reason: 'Auth rate limit exceeded',
      limit: options.max,
    });
    res.status(429).json(options.message);
  },
});

// API rate limiter (for general API endpoints)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'API rate limit exceeded, please slow down.',
    errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    return userId || req.ip || 'unknown';
  },
});

// Webhook rate limiter (more permissive for external services)
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: 'Webhook rate limit exceeded.',
    errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Simulation rate limiter (prevent abuse of SMS/voice sending)
export const simulationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 simulation sends per hour
  message: {
    success: false,
    error: 'Simulation rate limit exceeded. Please wait before sending more.',
    errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    return `sim:${userId || req.ip}`;
  },
});

// IP whitelist/blacklist middleware
const blockedIPs: Set<string> = new Set();
const trustedIPs: Set<string> = new Set(['127.0.0.1', '::1']);

export const ipFilterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (blockedIPs.has(clientIP)) {
    logSecurity('unauthorized_access', clientIP, req.path, req.requestId || 'unknown', {
      reason: 'Blocked IP',
    });
    throw AppError.forbidden('Access denied from this IP address');
  }
  
  next();
};

// Add IP to blocklist
export const blockIP = (ip: string): void => {
  blockedIPs.add(ip);
  logger.warn('IP blocked', { ip });
};

// Remove IP from blocklist
export const unblockIP = (ip: string): void => {
  blockedIPs.delete(ip);
  logger.info('IP unblocked', { ip });
};

// Check if IP is trusted
export const isTrustedIP = (ip: string): boolean => {
  return trustedIPs.has(ip);
};

// CORS error handler
export const corsErrorHandler = (err: Error, _req: Request, res: Response, next: NextFunction): void => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      error: 'Cross-origin request blocked',
      errorCode: ErrorCodes.FORBIDDEN,
    });
  } else {
    next(err);
  }
};

// Security headers middleware (additional headers not covered by helmet)
export const additionalSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

export default {
  requestIdMiddleware,
  requestTimingMiddleware,
  helmetMiddleware,
  xssProtection,
  mongoSanitizeMiddleware,
  generalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  webhookRateLimiter,
  simulationRateLimiter,
  ipFilterMiddleware,
  corsErrorHandler,
  additionalSecurityHeaders,
  blockIP,
  unblockIP,
  isTrustedIP,
};
