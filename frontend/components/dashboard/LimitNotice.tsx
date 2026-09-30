// frontend/components/dashboard/LimitNotice.tsx
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/app/context/authContext';

/** Where a user goes to fix a plan limit, depending on their role. */
function useUpgradeTarget(): { href: string | null; note: string | null } {
  const { state } = useAuth();
  const role: string | undefined = state.user?.role;
  if (role === 'admin') return { href: '/dashboard/subscribe-plan', note: null };
  if (role === 'individual') return { href: '/dashboard/my-plan', note: null };
  return { href: null, note: 'Ask your company admin to upgrade the plan for a higher limit.' };
}

interface NoticeProps {
  message: string;
  /** true = plan / limit problem (amber, with upgrade hint). false = generic error (red). */
  isPlan?: boolean;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  onRetry?: () => void;
}

/** Full-card notice that replaces a page's content. */
export function LimitNotice({
  message,
  isPlan = true,
  title,
  onBack,
  backLabel = 'Go back',
  onRetry,
}: NoticeProps) {
  const upgrade = useUpgradeTarget();
  const heading = title ?? (isPlan ? 'Not available on your plan' : 'Something went wrong');

  return (
    <Card
      className={`bg-slate-800/60 p-8 text-center max-w-md mx-auto ${
        isPlan ? 'border-yellow-500/30' : 'border-red-500/30'
      }`}
    >
      <AlertTriangle
        className={`w-10 h-10 mx-auto mb-4 ${isPlan ? 'text-yellow-500' : 'text-red-400'}`}
      />
      <h2 className="text-lg font-semibold text-foreground mb-2">{heading}</h2>
      <p className="text-sm text-muted-foreground mb-5">{message}</p>

      <div className="flex gap-3 justify-center flex-wrap">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition text-sm"
          >
            {backLabel}
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium"
          >
            Try again
          </button>
        )}
        {isPlan && upgrade.href && (
          <Link
            href={upgrade.href}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            View Plans
          </Link>
        )}
      </div>

      {isPlan && upgrade.note && (
        <p className="text-xs text-slate-400 mt-4">{upgrade.note}</p>
      )}
    </Card>
  );
}

/** Small inline version for use under content that should stay visible (e.g. a video). */
export function LimitBanner({ message, isPlan = true }: { message: string; isPlan?: boolean }) {
  const upgrade = useUpgradeTarget();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        isPlan ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-red-500/30 bg-red-500/10'
      }`}
    >
      <AlertTriangle
        className={`w-5 h-5 shrink-0 mt-0.5 ${isPlan ? 'text-yellow-500' : 'text-red-400'}`}
      />
      <div>
        <p className="text-sm text-foreground">{message}</p>
        {isPlan && upgrade.href && (
          <Link
            href={upgrade.href}
            className="inline-block mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            View plans →
          </Link>
        )}
        {isPlan && upgrade.note && <p className="text-xs text-slate-400 mt-1">{upgrade.note}</p>}
      </div>
    </div>
  );
}