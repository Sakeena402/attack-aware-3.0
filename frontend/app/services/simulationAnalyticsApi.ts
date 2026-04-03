import { apiService } from './api';

export const simulationAnalyticsApi = {
  getSimulationBreakdown: (companyId?: string) =>
    apiService.get<any>(`/analytics/simulations${companyId ? `?companyId=${companyId}` : ''}`),

  getDepartmentRisk: (companyId?: string) =>
    apiService.get<any[]>(`/analytics/department-risk${companyId ? `?companyId=${companyId}` : ''}`),
};
