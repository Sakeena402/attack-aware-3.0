// frontend/app/services/leaderboardApi.ts
import { apiService } from './api';
import { LeaderboardEntry } from './types';

export const leaderboardApi = {
  getAll: async (params?: {
    companyId?: string;
    department?: string;
    limit?: number;
  }): Promise<LeaderboardEntry[]> => {
    const query = new URLSearchParams();
    if (params?.companyId)  query.set('companyId', params.companyId);
    if (params?.department && params.department !== 'all') query.set('department', params.department);
    if (params?.limit)      query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiService.get<LeaderboardEntry[]>(`/leaderboard${qs ? `?${qs}` : ''}`);
    // Backend returns the array directly at data level (not wrapped in { entries: [] })
    return Array.isArray(res.data) ? res.data : [];
  },

  getUserRank: async (userId: string): Promise<{ rank: number; score: number; percentile: number } | null> => {
    try {
      const res = await apiService.get<{ rank: number; score: number; percentile: number }>(
        `/leaderboard/user/${userId}`
      );
      return res.data;
    } catch {
      return null;
    }
  },
};