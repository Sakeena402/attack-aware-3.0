import { apiService } from './api';

export interface Game {
  _id: string;
  name: string;
  description?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  maxScore: number;
  gameUrl: string;
  targetRoles: string[];
  isLocked?: boolean;
  thumbnail?: string;
}

export const gameApi = {
  getAll: async (): Promise<Game[]> => {
    const res = await apiService.get<Game[]>('/games');
    return res.data;
  },

  getById: async (id: string): Promise<Game> => {
    const res = await apiService.get<Game>(`/games/${id}`);
    return res.data;
  },

  saveScore: async (id: string, score: number): Promise<void> => {
    await apiService.post<void>(`/games/${id}/save-score`, { score });
  },
};