'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '@/app/services/api';
import { Card } from '@/components/ui/card';
import {
  Building2, Globe, Mail, Users, User as UserIcon,
  Hash, CheckCircle2, Clock, XCircle,
} from 'lucide-react';

interface CompanyData {
  _id: string;
  companyName: string;
  industry: string;
  companyUrl?: string;
  companyEmail?: string;
  employeeCount: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  contactPerson?: string;
  taxId?: string;
  enterpriseCode?: string;
  subscriptionPlan?: { name: string; category: string } | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending Approval',  icon: Clock,        badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Approved',          icon: CheckCircle2, badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Rejected',          icon: XCircle,      badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-700/40 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground">
          {value || <span className="text-slate-500 italic">Not set</span>}
        </p>
      </div>
    </div>
  );
}

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.get<CompanyData>('/companies/me')
      .then((res) => setCompany(res.data))
      .catch((err) => setError(err?.message ?? 'Failed to load company profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading company profile...</div>;
  }

  if (error || !company) {
    return (
      <div className="p-6 text-center">
        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">{error ?? 'No company found'}</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[company.approvalStatus];
  const Icon = cfg.icon;

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" />
          Company Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your organization's registered information</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-5 flex items-center justify-between border-b border-slate-700/50">
            <div>
              <h2 className="text-lg font-bold text-foreground">{company.companyName}</h2>
              <p className="text-sm text-muted-foreground">{company.industry}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>
          </div>

          <div className="px-6">
            <InfoRow icon={Globe} label="Company URL" value={company.companyUrl} />
            <InfoRow icon={Mail} label="Company Email" value={company.companyEmail} />
            <InfoRow icon={Users} label="Number of Employees" value={company.employeeCount} />
            <InfoRow icon={UserIcon} label="Contact Person" value={company.contactPerson} />
            <InfoRow icon={Hash} label="Tax ID" value={company.taxId} />
            {company.enterpriseCode && (
              <InfoRow icon={Hash} label="Enterprise Code" value={company.enterpriseCode} />
            )}
          </div>

          {company.approvalStatus === 'approved' && (
            <div className="px-6 pb-5 pt-2">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Current Plan
                </p>
                <p className="text-sm font-medium text-foreground">
                  {company.subscriptionPlan?.name ?? 'No plan subscribed yet'}
                </p>
              </div>
            </div>
          )}

          {company.approvalStatus === 'pending' && (
            <div className="px-6 pb-5 pt-2">
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-300">
                Your company is awaiting approval. You'll be able to subscribe to a plan once it's approved.
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}