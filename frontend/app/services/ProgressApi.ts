import { apiService } from './api';

export interface GameLog {
  game_title: string;
  score: number;
  played_at: string;
}

export interface QuizLog {
  quiz_title: string;
  score: number;
  attempted_at: string;
}

export interface VideoLog {
  video_id: string;
  status: string;
  watched_at: string;
}

export interface ProgressData {
  points: number;
  badge: string;
  riskScore: number;
  riskLevel: string;
  videosCompleted: number;
  quizzesTaken: number;
  gamesPlayed: number;
  history: {
    games: GameLog[];
    quizzes: QuizLog[];
    videos: VideoLog[];
  };
}

export const progressApi = {
  getMyProgress: async (): Promise<ProgressData> => {
    const res = await apiService.get<ProgressData>('/progress');
    return res.data;
  },
};