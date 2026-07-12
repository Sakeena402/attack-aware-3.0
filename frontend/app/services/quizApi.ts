import { apiService } from './api';

export interface QuizCategory {
  _id: string;
  title: string;
  title_ur: string;
  description: string;
  description_ur: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  timeLimit: number;
  thumbnail?: string;
  isLocked: boolean;
  targetRoles: string[];
}

export interface QuizQuestion {
  _id: string;
  question: string;
  question_ur: string;
  option_a: string; option_a_ur: string;
  option_b: string; option_b_ur: string;
  option_c: string; option_c_ur: string;
  option_d: string; option_d_ur: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  answer: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  passed: boolean;
  pointsEarned: number;
}

export const quizApi = {
  getCategories: async (): Promise<QuizCategory[]> => {
    const res = await apiService.get<QuizCategory[]>('/quizzes');
    return res.data;
  },
  getQuestions: async (quizId: string): Promise<QuizQuestion[]> => {
    const res = await apiService.get<QuizQuestion[]>(`/quizzes/${quizId}/questions`);
    return res.data;
  },
  submit: async (quizId: string, answers: Record<string, string>): Promise<QuizResult> => {
    const res = await apiService.post<QuizResult>(`/quizzes/${quizId}/submit`, { answers });
    return res.data;
  },
};