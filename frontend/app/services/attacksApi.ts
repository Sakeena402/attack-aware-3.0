// frontend/app/services/attacksApi.ts

import { apiService } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Attack {
  _id: string;
  name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttackPayload {
  name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ── API ───────────────────────────────────────────────────────────────────────

export const attacksApi = {

  // GET all attacks — any authenticated user
  getAll: async (): Promise<Attack[]> => {
    const res = await apiService.get<Attack[]>('/attacks');
    return Array.isArray(res.data) ? res.data : [];
  },

  // POST — super_admin only
  create: async (payload: CreateAttackPayload): Promise<Attack> => {
    const res = await apiService.post<Attack>('/attacks', payload);
    return res.data;
  },
};