import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, message = 'Too many requests' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
};

// Pre-configured rate limiters
export const trackingLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Too many tracking requests',
});

export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many webhook requests',
});

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  message: 'API rate limit exceeded',
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
  message: 'Too many authentication attempts',
});

export default {
  createRateLimiter,
  trackingLimiter,
  webhookLimiter,
  apiLimiter,
  authLimiter,
};
