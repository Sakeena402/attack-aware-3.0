// frontend/app/services/playbookApi.ts
import { apiService } from './api';

export type PlaybookSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PlaybookScope = 'global' | 'company';
export type PlaybookSource = 'seeded' | 'ai_generated';
export type PlaybookStatus = 'draft' | 'approved' | 'rejected';
export type PlaybookResourceType = 'video' | 'article' | 'document';

export interface PlaybookStep {
  description: string;
  // Display label only ("Employee" | "Admin" | "IT"), not a permission
  owner: string;
}

export interface PlaybookPhase {
  title: string;
  steps: PlaybookStep[];
}

export interface PlaybookResource {
  title: string;
  link: string;
  type: PlaybookResourceType;
}

export interface Playbook {
  _id: string;
  title: string;
  category: string;
  severity: PlaybookSeverity;
  phases: PlaybookPhase[];
  resources: PlaybookResource[];
  linkedCategories: string[];
  scope: PlaybookScope;
  companyId?: string;
  source: PlaybookSource;
  // Only present for ai_generated playbooks
  status?: PlaybookStatus;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Fields an admin may edit on a draft playbook
export interface PlaybookUpdatePayload {
  title?: string;
  category?: string;
  severity?: PlaybookSeverity;
  phases?: PlaybookPhase[];
  resources?: PlaybookResource[];
  linkedCategories?: string[];
}

export interface PlaybookListParams {
  category?: string;
  status?: PlaybookStatus; // admins only (ignored by backend for employees)
  companyId?: string; // super_admin only
}

// apiService.get/post/patch already return { success, data }, so we return res.data
export const playbookApi = {
  list: async (params: PlaybookListParams = {}): Promise<Playbook[]> => {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.status) query.append('status', params.status);
    if (params.companyId) query.append('companyId', params.companyId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiService.get<Playbook[]>(`/playbooks${qs}`);
    return res.data;
  },

  get: async (id: string): Promise<Playbook> => {
    const res = await apiService.get<Playbook>(`/playbooks/${id}`);
    return res.data;
  },

  update: async (id: string, payload: PlaybookUpdatePayload): Promise<Playbook> => {
    const res = await apiService.patch<Playbook>(`/playbooks/${id}`, payload);
    return res.data;
  },

  approve: async (id: string): Promise<Playbook> => {
    const res = await apiService.post<Playbook>(`/playbooks/${id}/approve`, {});
    return res.data;
  },

  reject: async (id: string): Promise<Playbook> => {
    const res = await apiService.post<Playbook>(`/playbooks/${id}/reject`, {});
    return res.data;
  },

  // generate() will be added in Step 3b, once the backend endpoint exists
};