'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import { Zap, CheckCircle2, Clock, XCircle, Loader2, ShieldAlert } from 'lucide-react';

interface Plan {
  id: string;
  category: 'individual' | 'enterprise';
  name: string;
  priceUSD: number;
  billing: 'free' | 'monthly' | 'trial';
  description: string;
  features: string[];
  highlight?: boolean;
}

interface SubscriptionRequest {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  planId: { name: string; category: string };
  createdAt: string;
  rejectionNote?: string;
}

interface MyPlan {
  planId: string;
  plan: Plan | null;
}

export default function IndividualSubscribePage() {
  const { state } = useAuth();
  const role: string | undefined = state.user?.role;
  const isIndividual = role === 'individual';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [myPlan, setMyPlan] = useState<MyPlan | null>(null);
  const [request, setRequest] = useState<SubscriptionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, myPlanRes] = await Promise.all([
        apiService.get<Plan[]>('/plans'),
        apiService.get<MyPlan>('/plans/my-plan'),
      ]);
      setPlans((plansRes.data || []).filter((p) => p.category === 'individual'));
      setMyPlan(myPlanRes.data ?? null);

      try {
        const statusRes = await apiService.get<SubscriptionRequest | null>('/plans/subscribe/status');
        setRequest(statusRes.data ?? null);
      } catch {
        setRequest(null);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isIndividual) load();
  }, [isIndividual, load]);

  async function handleRequestPlan(planId: string) {
    setSubmitting(planId);
    setError(null);
    try {
      await apiService.post('/plans/subscribe', { planId });
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to request plan');
    } finally {
      setSubmitting(null);
    }
  }

  if (!isIndividual) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">This page is for individual accounts.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading plans...</div>;
  }

  const currentId = myPlan?.planId ?? 'ind-basic';
  const currentName = myPlan?.plan?.name ?? 'Basic';
  const isPending = request?.status === 'pending';

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-400" />
          Subscribe to a Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          You are on the <strong>{currentName}</strong> plan. Plan changes are reviewed before they activate.
        </p>
      </motion.div>

      {isPending && (
        <div className="px-4 py-3 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-sm flex items-start gap-2">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Request pending for <strong>{request?.planId?.name}</strong>, submitted{' '}
            {new Date(request!.createdAt).toLocaleDateString()}. Our team will review it shortly.
          </span>
        </div>
      )}

      {request?.status === 'rejected' && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Your last request for <strong>{request.planId?.name}</strong> was not approved
            {request.rejectionNote ? `: ${request.rejectionNote}` : '.'} You can request a plan again below.
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentId;
          return (
            <Card
              key={plan.id}
              className={`p-5 flex flex-col ${plan.highlight ? 'border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800/60 border-slate-700/50'
                }`}
            >
              {plan.highlight && (
                <span className="self-start mb-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-semibold text-foreground">{plan.name}</h3>
              <div className="my-3">
                <span className="text-2xl font-bold text-foreground">
                  {plan.billing === 'free' ? 'Free' : `$${plan.priceUSD}`}
                </span>
                {plan.billing !== 'free' && (
                  <span className="text-xs text-muted-foreground ml-1">/mo</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
              <ul className="space-y-1.5 mb-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleRequestPlan(plan.id)}
                disabled={isCurrent || isPending || submitting === plan.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Requesting...
                  </>
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  `Request ${plan.name}`
                )}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}