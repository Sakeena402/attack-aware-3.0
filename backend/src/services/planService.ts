// backend/src/services/planService.ts
// Handles Membership Plan feature lookups for feature-gating middleware.

import { Company } from '../models/Company.js';

/**
 * Check whether a company's active MembershipPlan includes a named feature.
 * Returns false if:
 *   - companyId is not provided
 *   - the company has no subscriptionPlan set
 *   - the plan's features array does not include featureName
 */
export async function companyHasFeature(
  companyId: string | undefined,
  featureName: string
): Promise<boolean> {
  if (!companyId) return false;

  const company = await Company.findById(companyId)
    .populate('subscriptionPlan')
    .lean();

  if (!company || !company.subscriptionPlan) return false;

  const plan = company.subscriptionPlan as any;
  if (!Array.isArray(plan.features)) return false;

  return plan.features.includes(featureName);
}
