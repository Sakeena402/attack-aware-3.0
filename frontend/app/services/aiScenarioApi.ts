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

export interface AIQuizQuestion {
  _id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  answer: string;
  explanation?: string;
}

export interface AIQuiz {
  _id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  source: 'ai_generated';
  triggerContext?: {
    eventType?: string;
    topic?: string;
    month?: string;
    attackType?: string;
    employeeId?: string;
    generatedAt?: string;
  };
  questions: AIQuizQuestion[];
  createdAt: string;
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

  /** Fetch all AI-generated quizzes with their questions (admin view). */
  getAIQuizzes: async (): Promise<AIQuiz[]> => {
    const res = await apiService.get<ApiResponseWrapper<AIQuiz[]>>('/ai/quizzes/list');
    return res.data.data;
  },

  /**
   * Enqueue quiz generation for one or more employees.
   * Pass employeeIds as a string[] of specific IDs, or the string 'all' to target
   * every employee in the admin's company.
   */
  generateQuizForEmployees: async (payload: {
    employeeIds: string[] | 'all';
    topicMode: 'manual' | 'auto';
    topic?: string;
    dueInDays?: number;
  }): Promise<{ queued: boolean; count: number }> => {
    const res = await apiService.post<ApiResponseWrapper<{ queued: boolean; count: number }>>(
      '/ai/quizzes/generate-for-employee',
      payload
    );
    return res.data.data;
  },

  triggerMonthlyQuizzes: async (): Promise<{ successfulCompanies: number; failedCompanies: number }> => {
    const res = await apiService.post<ApiResponseWrapper<{ successfulCompanies: number; failedCompanies: number }>>('/ai/quizzes/trigger-monthly', {});
    return res.data.data;
  },
};
