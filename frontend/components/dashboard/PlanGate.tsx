// frontend/components/dashboard/PlanGate.tsx
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Clock, CreditCard, Loader2 } from 'lucide-react';
import { useCompanyGate } from '@/hooks/useCompanyGate';

export function PlanGate({ children }: { children: ReactNode }) {
  const { loading, isAdmin, isApproved, hasPlan } = useCompanyGate();

  // Non-admins (employee, individual, super_admin) are never gated here.
  if (!isAdmin) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-16"
      >
        <Card className="bg-slate-800/60 border-slate-700/50 p-8 text-center">
          <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Waiting for Company Approval
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            This feature unlocks once our team approves your company. Check your
            Company Profile for status updates.
          </p>
          <Link
            href="/dashboard/company-profile"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            View Company Profile
          </Link>
        </Card>
      </motion.div>
    );
  }

  if (!hasPlan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto mt-16"
      >
        <Card className="bg-slate-800/60 border-slate-700/50 p-8 text-center">
          <CreditCard className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Subscribe to a Plan to Unlock This
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Your company is approved! Choose a plan to start using campaigns,
            employees, analytics, and more.
          </p>
          <Link
            href="/dashboard/subscribe-plan"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Choose a Plan
          </Link>
        </Card>
      </motion.div>
    );
  }

  return <>{children}</>;
}