'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { api, DashboardStats, Employee, Campaign, LeaderboardEntry, AnalyticsOverview, Activity } from '../services/api';

// Generic fetcher using our API service
const fetcher = async <T>(endpoint: string): Promise<T> => {
  const response = await api.get<T>(endpoint);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch data');
  }
  return response.data;
};

// SWR default config
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
};

// Dashboard Stats Hook
export function useDashboardStats(companyId?: string) {
  const endpoint = `/analytics/dashboard${companyId ? `?companyId=${companyId}` : ''}`;
  return useSWR<DashboardStats>(
    endpoint,
    () => fetcher<DashboardStats>(endpoint),
    defaultConfig
  );
}

// Analytics Overview Hook
export function useAnalyticsOverview(companyId?: string) {
  const endpoint = `/analytics/overview${companyId ? `?companyId=${companyId}` : ''}`;
  return useSWR<AnalyticsOverview>(
    endpoint,
    () => fetcher<AnalyticsOverview>(endpoint),
    defaultConfig
  );
}

// Employees Hook
export function useEmployees(companyId?: string) {
  const endpoint = `/employees${companyId ? `?companyId=${companyId}` : ''}`;
  return useSWR<Employee[]>(
    endpoint,
    () => fetcher<Employee[]>(endpoint),
    defaultConfig
  );
}

// Single Employee Hook
export function useEmployee(id: string | null) {
  return useSWR<Employee>(
    id ? `/employees/${id}` : null,
    id ? () => fetcher<Employee>(`/employees/${id}`) : null,
    defaultConfig
  );
}

// Campaigns Hook
export function useCampaigns(companyId?: string) {
  const endpoint = `/campaigns${companyId ? `?companyId=${companyId}` : ''}`;
  return useSWR<Campaign[]>(
    endpoint,
    () => fetcher<Campaign[]>(endpoint),
    defaultConfig
  );
}

// Single Campaign Hook
export function useCampaign(id: string | null) {
  return useSWR<Campaign>(
    id ? `/campaigns/${id}` : null,
    id ? () => fetcher<Campaign>(`/campaigns/${id}`) : null,
    defaultConfig
  );
}

// Leaderboard Hook
export function useLeaderboard(companyId?: string, department?: string) {
  const params = new URLSearchParams();
  if (companyId) params.append('companyId', companyId);
  if (department) params.append('department', department);
  const query = params.toString();
  const endpoint = `/leaderboard${query ? `?${query}` : ''}`;
  
  return useSWR<LeaderboardEntry[]>(
    endpoint,
    () => fetcher<LeaderboardEntry[]>(endpoint),
    defaultConfig
  );
}

// Companies Hook
export function useCompanies() {
  return useSWR<Array<{ _id: string; companyName: string; industry: string }>>(
    '/companies',
    () => fetcher<Array<{ _id: string; companyName: string; industry: string }>>('/companies'),
    defaultConfig
  );
}

// Activity Feed Hook
export function useActivityFeed(companyId?: string, limit = 10) {
  const endpoint = `/activities${companyId ? `?companyId=${companyId}&limit=${limit}` : `?limit=${limit}`}`;
  return useSWR<Activity[]>(
    endpoint,
    () => fetcher<Activity[]>(endpoint),
    { ...defaultConfig, refreshInterval: 30000 } // Refresh every 30 seconds
  );
}

// Global Analytics Hook (for super admin)
export function useGlobalAnalytics() {
  return useSWR<AnalyticsOverview>(
    '/analytics/global',
    () => fetcher<AnalyticsOverview>('/analytics/global'),
    defaultConfig
  );
}

// User Rank Hook
export function useUserRank(userId: string | null) {
  return useSWR<{ rank: number; score: number; percentile: number }>(
    userId ? `/leaderboard/user/${userId}` : null,
    userId ? () => fetcher<{ rank: number; score: number; percentile: number }>(`/leaderboard/user/${userId}`) : null,
    defaultConfig
  );
}


