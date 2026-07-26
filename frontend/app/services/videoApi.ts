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
};