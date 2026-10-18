// frontend/hooks/useCompanyGate.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';

interface CompanyGateState {
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  hasPlan: boolean;
  planName?: string;
}

// Accounts that are never locked by company approval or plan status.
// Keep in sync with PLAN_EXEMPT_EMAILS on the backend. Override with
// NEXT_PUBLIC_PLAN_EXEMPT_EMAILS in frontend/.env.local (comma-separated).
const EXEMPT_EMAILS = (process.env.NEXT_PUBLIC_PLAN_EXEMPT_EMAILS ?? 'admin1@company1.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function useCompanyGate(): CompanyGateState {
  const { state } = useAuth();
  const role = state.user?.role;
  const isAdmin = role === 'admin';
  const isExempt = !!state.user?.email && EXEMPT_EMAILS.includes(state.user.email.toLowerCase());

  const [loading, setLoading] = useState(isAdmin && !isExempt);
  const [isApproved, setIsApproved] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [planName, setPlanName] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Only admins are gated by company/plan status — employees, individuals,
    // super_admin and exempt accounts pass straight through.
    if (!isAdmin || isExempt) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiService
      .get<{ approvalStatus: 'pending' | 'approved' | 'rejected'; subscriptionPlan?: { name: string } | null }>('/companies/me')
      .then((res) => {
        if (cancelled) return;
        setIsApproved(res.data.approvalStatus === 'approved');
        setHasPlan(!!res.data.subscriptionPlan);
        setPlanName(res.data.subscriptionPlan?.name);
      })
      .catch(() => {
        if (cancelled) return;
        setIsApproved(false);
        setHasPlan(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, isExempt]);

  return {
    loading,
    isAdmin,
    isApproved: isExempt || isApproved,
    hasPlan: isExempt || hasPlan,
    planName,
  };
}