// frontend/app/services/campaignReportsApi.ts (CREATE THIS FILE)
import { apiService } from './api';

export interface CampaignDetailedResults {
  campaign: {
    id: string; name: string; type: string; status: string;
    startDate: string; endDate?: string; companyId: string;
  };
  summary: {
    totalTargeted: number; sent: number; delivered: number;
    clicked: number; compromised: number; reported: number; ignored: number;
    deliveryRate: number; clickRate: number; compromiseRate: number;
    reportRate: number; safeRate: number;
  };
  userActions: {
    userId: string; userName: string; userEmail: string; department: string;
    riskScore: number; riskLevel: string; badge: string; points: number;
    action: string; actionTime?: string; actionDetail: string;
    sent: boolean; delivered: boolean; clicked: boolean;
    compromised: boolean; reported: boolean;
  }[];
  byAction: {
    compromised: any[]; clicked: any[]; reported: any[];
    engaged: any[]; ignored: any[];
  };
  byDepartment: Record<string, {
    total: number; clicked: number; compromised: number; reported: number;
    clickRate: number; reportRate: number; compromiseRate: number;
  }>;
  byRiskLevel: { high: any[]; medium: any[]; low: any[] };
}

export interface AggregateReportData {
  period: { startDate?: string; endDate?: string; totalCampaigns: number };
  overall: { totalSimulations: number; clickRate: number; compromiseRate: number; reportRate: number };
  departmentBreakdown: {
    department: string; total: number; clickRate: number; reportRate: number; compromiseRate: number;
  }[];
  simulationTypeBreakdown: {
    type: string; total: number; clickRate: number; reportRate: number; compromiseRate: number;
  }[];
  campaigns: { id: string; name: string; type: string; startDate: string; status: string }[];
}

export const campaignReportsApi = {
  getCampaignResults: async (campaignId: string): Promise<CampaignDetailedResults> => {
    const res = await apiService.get<CampaignDetailedResults>(`/campaigns/${campaignId}/results`);
    return res.data;
  },

  downloadCampaignPDF: async (campaignId: string): Promise<void> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${API_URL}/reports/campaign/${campaignId}/pdf`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  getAggregateReport: async (params: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
    departments?: string[];
  }): Promise<AggregateReportData> => {
    const query = new URLSearchParams();
    if (params.companyId)   query.set('companyId', params.companyId);
    if (params.startDate)   query.set('startDate', params.startDate);
    if (params.endDate)     query.set('endDate', params.endDate);
    if (params.departments) query.set('departments', params.departments.join(','));

    const res = await apiService.get<AggregateReportData>(`/reports/aggregate?${query.toString()}`);
    return res.data;
  },

  downloadAggregatePDF: async (params: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
    departments?: string[];
  }): Promise<void> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const query = new URLSearchParams();
    if (params.companyId)   query.set('companyId', params.companyId);
    if (params.startDate)   query.set('startDate', params.startDate);
    if (params.endDate)     query.set('endDate', params.endDate);
    if (params.departments) query.set('departments', params.departments.join(','));

    const response = await fetch(`${API_URL}/reports/aggregate/pdf?${query.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aggregate-report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};