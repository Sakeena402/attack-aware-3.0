'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Building2, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Users, Mail,
  RefreshCw, ShieldCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  _id: string;
  companyName: string;
  industry: string;
  adminId: {
    _id: string;
    name: string;
    email: string;
  };
  employeeCount: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  contactPerson?: string;
  taxId?: string;
  enterpriseCode?: string;
  createdAt: string;
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

// ── Company Card ──────────────────────────────────────────────────────────────

function CompanyCard({
  company,
  onAction,
  actioning,
}: {
  company: Company;
  onAction: (id: string, status: 'approved' | 'rejected') => void;
  actioning: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = STATUS_CONFIG[company.approvalStatus];
  const Icon   = cfg.icon;
  const isPending = company.approvalStatus === 'pending';

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
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {company.companyName}
                </p>
                <p className="text-xs text-muted-foreground">{company.industry}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>

              {/* Expand toggle */}
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

          {/* Admin info */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {company.adminId?.email ?? '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {company.employeeCount} employees
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
                      Admin Name
                    </p>
                    <p className="text-slate-300">{company.adminId?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Contact Person
                    </p>
                    <p className="text-slate-300">{company.contactPerson ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Tax ID
                    </p>
                    <p className="text-slate-300">{company.taxId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Enterprise Code
                    </p>
                    <p className="text-slate-300 font-mono">
                      {company.enterpriseCode ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Registered
                    </p>
                    <p className="text-slate-300">
                      {new Date(company.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons — only for pending */}
          {isPending && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => onAction(company._id, 'approved')}
                disabled={actioning === company._id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {actioning === company._id
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
              <button
                onClick={() => onAction(company._id, 'rejected')}
                disabled={actioning === company._id}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EnterpriseRequestsPage() {
  const { state } = useAuth();
  const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actioning, setActioning] = useState<string | null>(null);

  // Only super_admin can access this page
  const isSuperAdmin = state.user?.role === 'super_admin';

  const { data: companies = [], isLoading } = useSWR<Company[]>(
    isSuperAdmin ? 'enterprise-requests' : null,
    () => apiService.get<Company[]>('/company').then(r =>
      Array.isArray(r.data) ? r.data : []
    ),
    { revalidateOnFocus: false }
  );

  const filtered = filter === 'all'
    ? companies
    : companies.filter(c => c.approvalStatus === filter);

  const counts = {
    pending:  companies.filter(c => c.approvalStatus === 'pending').length,
    approved: companies.filter(c => c.approvalStatus === 'approved').length,
    rejected: companies.filter(c => c.approvalStatus === 'rejected').length,
  };

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setActioning(id);
    try {
      await apiService.patch(`/company/${id}`, { approvalStatus: status });
      mutate('enterprise-requests');
    } catch {
      // fail silently
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
          Only Super Admins can view enterprise requests.
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
            <Building2 className="w-6 h-6 text-blue-400" />
            Enterprise Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage enterprise registration requests
          </p>
        </div>

        {/* Summary badges */}
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
            {f === 'all' ? `All (${companies.length})` : `${f} (${counts[f as keyof typeof counts]})`}
          </button>
        ))}
      </motion.div>

      {/* Companies List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 bg-slate-800/40 border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No {filter} requests</p>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map(company => (
              <CompanyCard
                key={company._id}
                company={company}
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