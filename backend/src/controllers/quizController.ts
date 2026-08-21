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

    const { answers } = req.body as { answers: Record<string, string> };
    if (!answers || typeof answers !== 'object') throw new AppError('Answers are required', 400);

    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const questions = await QuizQuestion.find({ quizId });
    const totalQuestions = questions.length || quiz.totalQuestions;

    let score = 0;
    questions.forEach(q => {
      const given = answers[String(q._id)];
      if (given && given === q.correctOption) score++;
    });

    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    const passed = percentage >= 60;

    const actionType =
      percentage >= 90 ? 'quiz_90' :
      percentage >= 75 ? 'quiz_75' :
      percentage >= 60 ? 'quiz_60' :
      percentage >= 40 ? 'quiz_40' : 'quiz_0';

    const pointsMap: Record<string, number> = { quiz_90: 30, quiz_75: 20, quiz_60: 15, quiz_40: 8, quiz_0: 3 };
    const pointsEarned = pointsMap[actionType];

    await UserQuiz.create({
      userId,
      quizId,
      score,
      totalQuestions,
      completedAt: new Date(),
      companyId: req.user?.companyId,
    });

    await updateUserPoints(userId, actionType as any);
    await completeLinkedTasks(userId, 'quiz', quizId);

    res.json({ success: true, data: { score, totalQuestions, passed, pointsEarned } });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};