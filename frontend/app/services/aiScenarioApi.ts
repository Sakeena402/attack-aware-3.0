import { apiService } from './api';

export interface AIGeneratedContent {
  subject?: string;
  senderPersona: string;
  bodyHtml?: string;
  smsText?: string;
  category: string;
}

export interface AIScenario {
  _id: string;
  companyId: string;
  attackType: 'phishing' | 'smishing';
  targetEmployeeId?: string;
  targetDepartment?: string;
  difficulty: string;
  status: 'draft' | 'approved' | 'rejected';
  generatedContent: AIGeneratedContent;
  editedContent?: AIGeneratedContent;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
}

export const aiScenarioApi = {
  generateScenario: async (payload: {
    attackType: 'phishing' | 'smishing';
    targetEmployeeId?: string;
    targetDepartment?: string;
    difficulty?: string;
  }): Promise<AIScenario> => {
    const res = await apiService.post<ApiResponseWrapper<AIScenario>>('/ai/scenarios/generate', payload);
    return res.data.data;
  },

  getScenarios: async (companyId?: string, status?: string): Promise<AIScenario[]> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiService.get<ApiResponseWrapper<AIScenario[]>>(`/ai/scenarios${query}`);
    return res.data.data;
  },

  updateContent: async (id: string, editedContent: Partial<AIGeneratedContent>): Promise<AIScenario> => {
    const res = await apiService.patch<ApiResponseWrapper<AIScenario>>(`/ai/scenarios/${id}`, { editedContent });
    return res.data.data;
  },

  approveScenario: async (id: string): Promise<AIScenario> => {
    const res = await apiService.post<ApiResponseWrapper<AIScenario>>(`/ai/scenarios/${id}/approve`, {});
    return res.data.data;
  },

  rejectScenario: async (id: string): Promise<AIScenario> => {
    const res = await apiService.post<ApiResponseWrapper<AIScenario>>(`/ai/scenarios/${id}/reject`, {});
    return res.data.data;
  },
};
