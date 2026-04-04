


import { apiService } from './api';

export const superAdminApi = {
  getCompanies: () => apiService.get<any[]>('/super-admin/companies'),
  getCompany: (id: string) => apiService.get<any>(`/super-admin/companies/${id}`),
  createCompany: (data: any) => apiService.post('/super-admin/companies', data),
  updateCompany: (id: string, data: any) => apiService.put(`/super-admin/companies/${id}`, data),
  deleteCompany: (id: string) => apiService.delete(`/super-admin/companies/${id}`),
  getGlobalAnalytics: () => apiService.get<any>('/super-admin/analytics/global'),
  getAllUsers: () => apiService.get<any[]>('/super-admin/users'),
  getSystemHealth: () => apiService.get<any>('/super-admin/system/health'),
};



