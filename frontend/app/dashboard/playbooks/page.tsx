// frontend/app/dashboard/playbooks/page.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/app/context/authContext';
import { playbookApi } from '@/app/services/playbookApi';
import type { Playbook, PlaybookSeverity } from '@/app/services/playbookApi';
import {
  ShieldAlert,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Globe,
  ArrowRight,
  ListChecks,
} from 'lucide-react';

type StatusTab = 'all' | 'draft' | 'approved' | 'rejected';

const SEVERITY_STYLES: Record<PlaybookSeverity, string> = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Higher number = shown first
const SEVERITY_RANK: Record<PlaybookSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function countSteps(playbook: Playbook): number {
  return playbook.phases.reduce((total, phase) => total + phase.steps.length, 0);
}

export default function PlaybooksPage() {
  const { state } = useAuth();
  const role = state.user?.role;
  const isAdminLike = role === 'admin' || role === 'super_admin';

  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: playbooks, isLoading, error } = useSWR<Playbook[]>(
    'playbooks',
    () => playbookApi.list(),
    { revalidateOnFocus: false }
  );

  const all = playbooks ?? [];

  // Category chips are built from whatever playbooks exist
  const categories = Array.from(new Set(all.map((p) => p.category))).sort();

  // Status tab applies to company (AI-generated) playbooks; seeded ones have no status
  const matchesStatus = (p: Playbook): boolean => {
    if (statusTab === 'all') return true;
    return p.status === statusTab;
  };

  const filtered = all
    .filter((p) => {
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesSearch =
        !searchTerm ||
        `${p.title} ${p.category}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus(p) && matchesCategory && matchesSearch;
    })
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const tabCount = (tab: StatusTab): number =>
    tab === 'all' ? all.length : all.filter((p) => p.status === tab).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 cyber-glow">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-poppins text-foreground">Incident Response</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Step-by-step guides for what to do when a security incident happens.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Status tabs: admins only */}
          {isAdminLike ? (
            <div className="flex bg-muted/40 p-1 rounded-xl border border-purple-500/20 overflow-x-auto">
              {(['all', 'draft', 'approved', 'rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    statusTab === tab
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="capitalize">{tab === 'draft' ? 'Drafts (Needs Review)' : tab}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 font-semibold">
                    {tabCount(tab)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search playbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-purple-500/20 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {['all', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${
                  categoryFilter === cat
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-muted/40 text-muted-foreground border-purple-500/20 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Playbook grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-muted/30 rounded-xl animate-pulse border border-purple-500/10" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-muted/20 border border-red-500/20 rounded-2xl">
            <XCircle className="w-12 h-12 mx-auto text-red-400/60 mb-3" />
            <p className="text-lg font-medium text-foreground">Could not load playbooks</p>
            <p className="text-sm text-muted-foreground mt-1">Please refresh the page and try again.</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((playbook) => (
                <motion.div
                  key={playbook._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href={`/dashboard/playbooks/${playbook._id}`} className="block h-full">
                    <Card className="p-5 border-purple-500/20 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/5 via-slate-900/50 to-blue-500/5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-full space-y-4 shadow-lg group">
                      <div>
                        {/* Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {playbook.category}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[playbook.severity]}`}
                          >
                            {playbook.severity}
                          </span>
                        </div>

                        <h3 className="font-bold text-foreground group-hover:text-purple-300 transition-colors text-base">
                          {playbook.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ListChecks className="w-3.5 h-3.5 text-purple-400" />
                            {playbook.phases.length} phases, {countSteps(playbook)} steps
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-purple-500/10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {playbook.scope === 'global' ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              Standard
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-purple-400" />
                              Company
                            </span>
                          )}

                          {playbook.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full border capitalize flex items-center gap-1 ${
                                playbook.status === 'approved'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : playbook.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              }`}
                            >
                              {playbook.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                              {playbook.status === 'rejected' && <XCircle className="w-3 h-3" />}
                              {playbook.status === 'draft' && <Clock className="w-3 h-3" />}
                              {playbook.status}
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-purple-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Open <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/20 border border-purple-500/20 rounded-2xl">
            <ShieldAlert className="w-12 h-12 mx-auto text-purple-400/50 mb-3" />
            <p className="text-lg font-medium text-foreground">No playbooks found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || categoryFilter !== 'all' || statusTab !== 'all'
                ? 'Try adjusting your filters.'
                : 'No incident response playbooks are available yet.'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}