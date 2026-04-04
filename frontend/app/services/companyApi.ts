import { apiService } from './api';

export interface Company {
  _id: string;
  companyName: string;
  industry: string;
}

export const companyApi = {
  getAll: () => apiService.get<Company[]>('/companies'),
  getById: (id: string) => apiService.get<Company>(`/companies/${id}`),
  create: (data: { companyName: string; industry: string }) => apiService.post('/companies', data),
  update: (id: string, data: Partial<{ companyName: string; industry: string }>) => apiService.put(`/companies/${id}`, data),
  delete: (id: string) => apiService.delete<{ success: boolean }>(`/companies/${id}`),
};



