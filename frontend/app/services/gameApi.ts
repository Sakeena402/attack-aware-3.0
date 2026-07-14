import { api } from './api';

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
        const res = await api.get('/games');
        return res.data.data;
    },

    // NEW — this was missing, which is what made games/[id]/page.tsx unable
    // to load anything (paired with the missing backend GET /:id route).
    getById: async (id: string): Promise<Game> => {
        const res = await api.get(`/games/${id}`);
        return res.data.data;
    },

    // NEW — reports a finished game's score to the backend.
    saveScore: async (id: string, score: number): Promise<void> => {
        await api.post(`/games/${id}/save-score`, { score });
    },
};
