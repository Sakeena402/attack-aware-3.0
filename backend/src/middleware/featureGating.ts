// backend/src/middleware/featureGating.ts
// Middleware factory that gates routes behind MembershipPlan feature flags.
// Usage: router.get('/some-route', requireFeature('PDF reports'), handler)

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { companyHasFeature } from '../services/planService.js';
import { AppError } from '../utils/errorHandler.js';

/**
 * Returns Express middleware that blocks access unless the caller's company plan
 * includes the given featureName. super_admin always bypasses this check.
 */
export function requireFeature(featureName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      // super_admin is never gated by a company plan
      if (req.user.role === 'super_admin') {
        return next();
      }

      const allowed = await companyHasFeature(req.user.companyId, featureName);
      if (!allowed) {
        res.status(403).json({
          success: false,
          error: `Your current plan does not include this feature: "${featureName}". Please upgrade your plan.`,
        });
        return;
      }

      next();
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Feature check failed' });
      }
    }
  };
}
