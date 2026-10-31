// frontend/app/dashboard/playbooks/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-notification';
import { useAuth } from '@/app/context/authContext';
import { playbookApi } from '@/app/services/playbookApi';
import type { Playbook, PlaybookSeverity, PlaybookResourceType } from '@/app/services/playbookApi';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  FileText,
  File,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

const SEVERITY_STYLES: Record<PlaybookSeverity, string> = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const RESOURCE_ICONS: Record<PlaybookResourceType, React.ComponentType<{ className?: string }>> = {
  video: Video,
  article: FileText,
  document: File,
};

export default function PlaybookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { state } = useAuth();
  const { success, error: showError } = useToast();
  const isAdminLike = state.user?.role === 'admin' || state.user?.role === 'super_admin';

  // Visual-only checklist state. Never saved; resets on every page load.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isActing, setIsActing] = useState(false);

  const { data: playbook, isLoading, error, mutate } = useSWR<Playbook>(
    id ? `playbook-${id}` : null,
    () => playbookApi.get(id),
    { revalidateOnFocus: false }
  );

  const toggleStep = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const runReviewAction = async (action: 'approve' | 'reject') => {
    try {
      setIsActing(true);
      const updated =
        action === 'approve' ? await playbookApi.approve(id) : await playbookApi.reject(id);
      await mutate(updated, { revalidate: false });
      success(
        action === 'approve' ? 'Approved' : 'Rejected',
        action === 'approve'
          ? 'Employees in your company can now see this playbook.'
          : 'This playbook is hidden from employees.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      showError('Error', msg);
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/playbooks" className="inline-flex items-center gap-2 text-sm text-purple-300">
          <ArrowLeft className="w-4 h-4" /> Back to playbooks
        </Link>
        <div className="text-center py-16 bg-muted/20 border border-red-500/20 rounded-2xl">
          <XCircle className="w-12 h-12 mx-auto text-red-400/60 mb-3" />
          <p className="text-lg font-medium text-foreground">Playbook not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            It may not exist, or you may not have access to it.
          </p>
        </div>
      </div>
    );
  }

  const canReview = isAdminLike && playbook.scope === 'company';

  return (
    <div className="space-y-8 max-w-4xl">
      <Link
        href="/dashboard/playbooks"
        className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
      >
        <ArrowLeft className="w-4 h-4" /> Back to playbooks
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 cyber-glow">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-poppins text-foreground">{playbook.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {playbook.category}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[playbook.severity]}`}
              >
                {playbook.severity}
              </span>
              {playbook.status && (
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize flex items-center gap-1 ${
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
          </div>
        </div>

        {/* Admin review controls (company playbooks only) */}
        {canReview && (
          <div className="flex items-center gap-3 pt-2">
            {playbook.status === 'draft' && (
              <Button
                disabled={isActing}
                onClick={() => runReviewAction('approve')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
              >
                Approve
              </Button>
            )}
            {(playbook.status === 'draft' || playbook.status === 'approved') && (
              <Button
                variant="outline"
                disabled={isActing}
                onClick={() => runReviewAction('reject')}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Reject
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tick marks below are only to help you follow along. They are not saved.
        </p>
      </motion.div>

      {/* Phases */}
      <div className="space-y-5">
        {playbook.phases.map((phase, phaseIndex) => (
          <motion.div
            key={`${phase.title}-${phaseIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * phaseIndex }}
          >
            <Card className="p-5 border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-slate-900/50 to-blue-500/5 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-200 text-sm font-bold flex items-center justify-center">
                  {phaseIndex + 1}
                </span>
                <h2 className="text-lg font-bold text-foreground">{phase.title}</h2>
              </div>

              <ul className="space-y-2">
                {phase.steps.map((step, stepIndex) => {
                  const key = `${phaseIndex}-${stepIndex}`;
                  const isDone = checked[key] === true;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => toggleStep(key)}
                        className="w-full flex items-start gap-3 text-left p-3 rounded-xl bg-muted/30 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'border-purple-500/40 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}
                        >
                          {step.description}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {step.owner}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Resources */}
      {playbook.resources.length > 0 && (
        <Card className="p-5 border-purple-500/20 rounded-2xl">
          <h2 className="text-lg font-bold text-foreground mb-4">Resources</h2>
          <ul className="space-y-2">
            {playbook.resources.map((resource, index) => {
              const Icon = RESOURCE_ICONS[resource.type];
              return (
                <li key={`${resource.link}-${index}`}>
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                  >
                    <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{resource.title}</span>
                    <span className="text-[11px] capitalize text-muted-foreground">{resource.type}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}