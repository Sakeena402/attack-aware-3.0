// frontend/app/services/campaignApi.ts
import { apiService } from './api';
import { Campaign } from './types';

export const campaignApi = {
  getAll: async (companyId?: string): Promise<Campaign[]> => {
    const qs = companyId ? `?companyId=${companyId}` : '';
    const res = await apiService.get<Campaign[]>(`/campaigns${qs}`);
    // Backend returns the array directly under data
    return Array.isArray(res.data) ? res.data : [];
  },

  getById: async (id: string): Promise<Campaign> => {
    const res = await apiService.get<Campaign>(`/campaigns/${id}`);
    return res.data;
  },

  create: async (campaign: Partial<Campaign> & { companyId?: string }): Promise<Campaign> => {
    const res = await apiService.post<Campaign>('/campaigns', campaign);
    return res.data;
  },

  update: async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const res = await apiService.put<Campaign>(`/campaigns/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`/campaigns/${id}`);
  },

  launch: async (id: string): Promise<Campaign> => {
    const res = await apiService.post<Campaign>(`/campaigns/${id}/launch`);
    return res.data;
  },

  pause: async (id: string): Promise<Campaign> => {
    const res = await apiService.post<Campaign>(`/campaigns/${id}/pause`);
    return res.data;
  },
};