import { apiService } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalEmployees:     number;
  totalCampaigns:     number;
  activeCampaigns:    number;
  totalSimulations:   number;
  totalClicks:        number;
  totalReports:       number;
  totalCompromised:   number;
  phishProneRate:     number;   // ✅ primary industry KPI
  avgClickRate:       number;   // alias of phishProneRate
  avgReportRate:      number;
  avgCompromiseRate:  number;
  trainingProgress:   number;
  overallRiskScore:   number;
  riskDistribution:   { very_low: number; low: number; moderate: number; high: number; critical: number };
  responseTimeBuckets?: { excellent: number; good: number; average: number; poor: number }; // A.4
  period?:            string;
}

export interface SimulationAnalytics {
  phishing: {
    total: number; clicked: number; compromised: number; reported: number;
    clickRate: number; compromiseRate: number; reportRate: number;
  };
  smishing: {
    sent: number; delivered: number; clicked: number;
    compromised: number; reported: number;
    deliveryRate: number; clickRate: number;
    compromiseRate: number; reportRate: number;
  };
  vishing: {
    initiated: number; answered: number; engaged: number; reported: number;
    answerRate: number; engagementRate: number; reportRate: number;
  };
  summary: {
    totalSimulations: number; totalCompromised: number;
    totalReported: number; overallRiskScore: number;
  };
  period?: string;
}

export interface DepartmentRisk {
  department:      string;
  employees:       number;
  totalSims:       number;
  totalClicks:     number;
  totalReports:    number;
  clickRate:       number;
  reportRate:      number;
  compromiseRate:  number;
  avgRiskScore:    number;
  criticalRiskCount: number;
  highRiskCount:   number;
  moderateRiskCount: number;
  lowRiskCount:    number;
  veryLowRiskCount:  number;
}

export interface UserAnalytics {
  user: {
    id: string; name: string; email: string; points: number;
    badge: string; riskScore: number; riskLevel: string; department: string;
    achievements?: string[]; // A.5
    riskTrend?: string;
    riskConfidence?: string;
    riskBreakdown?: any;
  };
  stats: {
    totalSimulations: number; clicks: number; credentials: number;
    reports: number; ignored: number;
    phishProneRate: number;
    clickRate: number; reportRate: number;
    compromiseRate: number; safeRate: number;
  };
  ranking: { rank: number | null; percentile: number | null };
  history: {
    date: string; campaignName: string; type: string;
    action: string; pointsEarned: number;
    responseTimeBucket?: string; // A.4
  }[];
}

// ── API calls — all accept optional period param ──────────────────────────────
export const analyticsApi = {

  getDashboard: async (companyId?: string, period?: string): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (period)    params.append('period',    period);     // ✅ pass period
    const qs  = params.toString() ? `?${params.toString()}` : '';
    const res = await apiService.get<DashboardStats>(`/analytics/dashboard${qs}`);
    return res.data;
  },

  getSimulations: async (companyId?: string, period?: string): Promise<SimulationAnalytics> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (period)    params.append('period',    period);     // ✅ pass period
    const qs  = params.toString() ? `?${params.toString()}` : '';
    const res = await apiService.get<SimulationAnalytics>(`/analytics/simulations${qs}`);
    return res.data;
  },

  getDepartmentRisk: async (companyId?: string, period?: string): Promise<DepartmentRisk[]> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (period)    params.append('period',    period);     // ✅ pass period
    const qs  = params.toString() ? `?${params.toString()}` : '';
    const res = await apiService.get<DepartmentRisk[]>(`/analytics/department-risk${qs}`);
    return res.data;
  },

  getUserAnalytics: async (userId: string): Promise<UserAnalytics> => {
    const res = await apiService.get<UserAnalytics>(`/analytics/user/${userId}`);
    return res.data;
  },

  getMyAnalytics: async (): Promise<UserAnalytics> => {
    const res = await apiService.get<UserAnalytics>('/analytics/me');
    return res.data;
  },
};