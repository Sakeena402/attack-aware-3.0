
// frontend/app/services/employeeApi.ts
import { apiService } from './api';
import { Employee } from './types';

export interface PaginatedEmployees {
  employees: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const employeeApi = {
  // Returns the full paginated shape the backend actually sends
  getAll: async (params?: {
    companyId?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedEmployees> => {
    const query = new URLSearchParams();
    if (params?.companyId)  query.set('companyId', params.companyId);
    if (params?.department) query.set('department', params.department);
    if (params?.search)     query.set('search', params.search);
    if (params?.page)       query.set('page', String(params.page));
    if (params?.limit)      query.set('limit', String(params.limit));

    const qs = query.toString();
    const res = await apiService.get<PaginatedEmployees>(`/employees${qs ? `?${qs}` : ''}`);
    return res.data; // { employees: [...], pagination: { ... } }
  },

  getById: async (id: string): Promise<Employee> => {
    const res = await apiService.get<Employee>(`/employees/${id}`);
    return res.data;
  },

  create: async (employee: Partial<Employee> & { password: string }): Promise<Employee> => {
    const res = await apiService.post<Employee>('/employees', employee);
    return res.data;
  },

  update: async (id: string, data: Partial<Employee> & { password?: string }): Promise<Employee> => {
    const res = await apiService.put<Employee>(`/employees/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`/employees/${id}`);
  },

  getDepartments: async (companyId?: string): Promise<string[]> => {
    const qs = companyId ? `?companyId=${companyId}` : '';
    const res = await apiService.get<string[]>(`/employees/departments${qs}`);
    return res.data;
  },
}; 