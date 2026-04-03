// /services/api/analyticsApi.ts
import { apiService } from './api';
import { AnalyticsData } from './types';

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsData> => {
    const res = await apiService.get<AnalyticsData>('/analytics/overview');
    return res.data;
  },
};