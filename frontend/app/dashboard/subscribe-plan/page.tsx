'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Zap, CheckCircle2, Clock, XCircle, Loader2, ShieldAlert,
} from 'lucide-react';

interface Plan {
  id: string;
  category: 'individual' | 'enterprise';
  name: string;
  seats: number;
  priceUSD: number;
  priceUSDPerUser?: number;
  billing: 'free' | 'monthly' | 'trial';
  trialDays?: number;
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

interface CompanyData {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionPlan?: { name: string } | null;
}

export default function SubscribePlanPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [request, setRequest] = useState<SubscriptionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, plansRes] = await Promise.all([
        apiService.get<CompanyData>('/companies/me'),
        apiService.get<Plan[]>('/plans'),
      ]);
      setCompany(companyRes.data);
      setPlans((plansRes.data || []).filter((p) => p.category === 'enterprise'));

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
  }

  useEffect(() => {
    loadEverything();
  }, []);

  async function handleRequestPlan(planId: string) {
    setSubmitting(planId);
    setError(null);
    try {
      await apiService.post('/plans/subscribe', { planId });
      await loadEverything();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to request plan');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading plans...</div>;
  }

  // Company not yet approved — block plan requests entirely
  if (company && company.approvalStatus !== 'approved') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <ShieldAlert className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Company Approval Pending</h2>
        <p className="text-sm text-muted-foreground">
          Your company must be approved by our team before you can subscribe to a plan.
          Check back soon, or visit your Company Profile page for status.
        </p>
      </div>
    );
  }

  // Already has an active plan
  if (company?.subscriptionPlan) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground mb-2">
          You're subscribed to {company.subscriptionPlan.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          View full plan details on your Company Profile page.
        </p>
      </div>
    );
  }

  // A request is currently pending
  if (request?.status === 'pending') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Request Pending: {request.planId?.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(request.createdAt).toLocaleDateString()}. Our team will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-400" />
          Choose a Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a plan for your company. Your request will be reviewed before it activates.
        </p>
      </motion.div>

      {request?.status === 'rejected' && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Your previous request for <strong>{request.planId?.name}</strong> was not approved
            {request.rejectionNote ? `: ${request.rejectionNote}` : '.'} You can request a new plan below.
          </span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-5 flex flex-col ${
              plan.highlight ? 'border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800/60 border-slate-700/50'
            }`}
          >
            {plan.highlight && (
              <span className="self-start mb-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                Most Popular
              </span>
            )}
            <h3 className="font-semibold text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{plan.seats} seats</p>
            <div className="mb-3">
              <span className="text-2xl font-bold text-foreground">${plan.priceUSD}</span>
              <span className="text-xs text-muted-foreground ml-1">
                {plan.billing === 'trial' ? `/ ${plan.trialDays}-day trial` : '/mo'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 flex-1">{plan.description}</p>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleRequestPlan(plan.id)}
              disabled={submitting === plan.id}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting === plan.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Requesting...
                </>
              ) : (
                'Request This Plan'
              )}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}