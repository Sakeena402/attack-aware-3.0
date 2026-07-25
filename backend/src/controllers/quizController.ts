import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Quiz } from '../models/Quiz.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { completeLinkedTasks } from '../services/taskService.js';
import { AppError } from '../utils/errorHandler.js';

export const getQuizzes = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const quizzes = await Quiz.find().sort({ order: 1 });

    let unlockedCount = 5;

    if (req.user?.role === 'super_admin') {
      unlockedCount = quizzes.length;
    }

    const withLockStatus = quizzes.map((q, index) => ({
      ...q.toObject(),
      isLocked: index >= unlockedCount,
    }));

    res.json({ success: true, data: withLockStatus });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const createQuiz = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const questions = await QuizQuestion.find({ quizId: req.params.id });
    res.json({ success: true, data: questions });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
};

export const submitQuiz = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const quizId = req.params.id;
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { score } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const percentage = (score / quiz.totalQuestions) * 100;
    const actionType: 'quiz_pass' | 'quiz_fail' = percentage >= 60 ? 'quiz_pass' : 'quiz_fail';

    const userQuiz = await UserQuiz.create({
      userId,
      quizId,
      score,
      totalQuestions: quiz.totalQuestions,
      completedAt: new Date(),
      companyId: req.user?.companyId
    });

    await updateUserPoints(userId, actionType);

    await completeLinkedTasks(userId, 'quiz', quizId);

    res.json({ success: true, data: userQuiz });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};