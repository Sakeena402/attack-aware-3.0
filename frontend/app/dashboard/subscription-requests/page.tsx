'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  CreditCard, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Building2, Mail,
  RefreshCw, ShieldCheck, Tag,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubscriptionRequest {
  _id: string;
  companyId?: {
    _id: string;
    companyName: string;
    industry: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
  } | null;
  userId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  planId: {
    _id: string;
    name: string;
    category: string;
    priceUSD: number;
  };
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  rejectionNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onAction,
  actioning,
}: {
  request: SubscriptionRequest;
  onAction: (id: string, action: 'approve' | 'reject', rejectionNote?: string) => void;
  actioning: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  const cfg = STATUS_CONFIG[request.status];
  const Icon = cfg.icon;
  const isPending = request.status === 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="bg-slate-800/60 border-slate-700/50 hover:border-blue-500/30 transition-colors overflow-hidden">
        <div className="p-5">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {request.companyId?.companyName ?? request.userId?.name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {request.planId?.name ?? '—'}
                  {typeof request.planId?.priceUSD === 'number' && (
                    <span className="text-slate-500">· ${request.planId.priceUSD}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>

              <button
                onClick={() => setExpanded(e => !e)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {expanded
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requested-by info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {request.requestedBy?.email ?? '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {request.companyId?.industry ?? 'Individual user'}
            </span>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Requested By
                    </p>
                    <p className="text-slate-300">{request.requestedBy?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Plan Category
                    </p>
                    <p className="text-slate-300 capitalize">{request.planId?.category ?? '—'}</p>
                  </div>
                  {request.companyId && (
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        Company Approval Status
                      </p>
                      <p className="text-slate-300 capitalize">{request.companyId.approvalStatus}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Submitted
                    </p>
                    <p className="text-slate-300">
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  {request.rejectionNote && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                        Rejection Note
                      </p>
                      <p className="text-red-300">{request.rejectionNote}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions — only for pending */}
          {isPending && (
            <div className="pt-4 mt-4 border-t border-slate-700/50">
              {!showRejectInput ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => onAction(request._id, 'approve')}
                    disabled={actioning === request._id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    {actioning === request._id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={actioning === request._id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optional reason for rejection..."
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAction(request._id, 'reject', rejectionNote || undefined)}
                      disabled={actioning === request._id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      {actioning === request._id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />}
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setShowRejectInput(false); setRejectionNote(''); }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SubscriptionRequestsPage() {
  const { state } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actioning, setActioning] = useState<string | null>(null);

  const isSuperAdmin = state.user?.role === 'super_admin';

  const { data: requests = [], isLoading } = useSWR<SubscriptionRequest[]>(
    isSuperAdmin ? 'subscription-requests' : null,
    () => apiService.get<SubscriptionRequest[]>('/super-admin/subscription-requests').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false }
  );

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const counts = {
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  async function handleAction(id: string, action: 'approve' | 'reject', rejectionNote?: string) {
    setActioning(id);
    try {
      if (action === 'approve') {
        await apiService.post(`/super-admin/subscription-requests/${id}/approve`);
      } else {
        await apiService.post(`/super-admin/subscription-requests/${id}/reject`, { rejectionNote });
      }
      mutate('subscription-requests');
    } catch {
      // fail silently, matching enterprise-requests page's existing pattern
    } finally {
      setActioning(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">Access Denied</p>
        <p className="text-slate-500 text-sm mt-1">
          Only Super Admins can view subscription requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-400" />
            Subscription Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage company and individual plan requests
          </p>
        </div>

        <div className="flex gap-2 text-xs shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-400 font-semibold">
            {counts.pending} pending
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 font-semibold">
            {counts.approved} approved
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 font-semibold">
            {counts.rejected} rejected
          </span>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2"
      >
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
              filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f === 'all' ? `All (${requests.length})` : `${f} (${counts[f as keyof typeof counts]})`}
          </button>
        ))}
      </motion.div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50 p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No {filter} requests</p>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map(request => (
              <RequestCard
                key={request._id}
                request={request}
                onAction={handleAction}
                actioning={actioning}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}