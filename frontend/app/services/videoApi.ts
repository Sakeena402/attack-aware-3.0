import { apiService } from './api';

export interface Video {
  _id: string;
  title: string;
  title_ur?: string;
  description?: string;
  filePath: string;
  thumbnail?: string;
  category: string;
  language: 'en' | 'ur';
  targetRoles: string[];
  isCompleted?: boolean;
  isLocked?: boolean;
  createdAt: string;
}

export interface UserVideoProgress {
  videoId: string;
  status: 'Incomplete' | 'Completed';
  watchedAt?: string;
}

export const videoApi = {
  getAll: async (language?: 'en' | 'ur', category?: string): Promise<Video[]> => {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params}` : '';
    const res = await apiService.get<Video[]>(`/videos${qs}`);
    return res.data;
  },
  getById: async (id: string): Promise<Video> => {
    const res = await apiService.get<Video>(`/videos/${id}`);
    return res.data;
  },
  markComplete: async (id: string): Promise<void> => {
    await apiService.patch<void>(`/videos/${id}/watch`, { status: 'Completed' });
  },
  getMyProgress: async (): Promise<UserVideoProgress[]> => {
    const res = await apiService.get<UserVideoProgress[]>('/videos/my-progress');
    return res.data;
  },
};