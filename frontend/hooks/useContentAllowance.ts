// frontend/hooks/useContentAllowance.ts
import useSWR from 'swr';
import { useAuth } from '@/app/context/authContext';
import { apiService } from '@/app/services/api';

export interface ContentAllowance {
  videosEn: number;
  videosUr: number;
  games: number;
  quizzes: number;
}

/** Where a locked item's "Upgrade" button should send this role. */
export function getUpgradeHref(role?: string): string {
  if (role === 'individual') return '/dashboard/my-plan';
  if (role === 'admin') return '/dashboard/subscribe-plan';
  return '/dashboard/subscribe';
}

/**
 * The monthly content allowance of the logged-in user's plan (company or individual).
 * allowance is null when the user is not limited or has no usable plan.
 */
export function useContentAllowance() {
  const { state } = useAuth();
  const role: string | undefined = state.user?.role;
  const userId: string | undefined = state.user?.id;

  const { data, error } = useSWR<ContentAllowance | null>(
    userId ? ['content-allowance', userId] : null,
    async () => {
      const res = await apiService.get<{ allowance: ContentAllowance | null }>('/plans/my-allowance');
      return res.data?.allowance ?? null;
    },
    { revalidateOnFocus: false }
  );

  return {
    allowance: data ?? null,
    /** true while the allowance is still being fetched */
    loading: !!userId && data === undefined && !error,
    isIndividual: role === 'individual',
    upgradeHref: getUpgradeHref(role),
  };
}