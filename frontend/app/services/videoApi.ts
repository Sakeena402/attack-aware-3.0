import { apiService } from './api';

export interface WatchedVideo {
  videoId: string;
  watchedAt: string;
}

export const videoApi = {
  markWatched: async (videoId: string): Promise<void> => {
    await apiService.post<void>(`/videos/${videoId}/watch`);
  },
  getMyWatched: async (): Promise<WatchedVideo[]> => {
    const res = await apiService.get<WatchedVideo[]>('/videos/me/completed');
    return res.data;
  },
  /** Throws a 403 ApiError when the monthly video allowance is used up. */
  checkAccess: async (videoId: string): Promise<void> => {
    await apiService.get<void>(`/videos/${videoId}/access`);
  },
};