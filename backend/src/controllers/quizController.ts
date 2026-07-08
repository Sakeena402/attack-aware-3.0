import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Quiz } from '../models/Quiz.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { AppError } from '../utils/errorHandler.js';

export const getQuizzes = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const quizzes = await Quiz.find().sort({ order: 1 });

    let unlockedCount = 5; // default: free tier

    if (req.user?.role === 'super_admin') {
      unlockedCount = quizzes.length; // super_admin always sees everything
    } else {
      // TODO: fetch the company's actual plan name here
      // const company = await Company.findById(req.user?.companyId).populate('subscriptionPlan');
      // const planName = company?.subscriptionPlan?.name?.toLowerCase().replace(/[^a-z]/g, '');
      // if (planName === 'inspiremax') unlockedCount = quizzes.length;
      // else if (planName === 'focuspro') unlockedCount = 10;
      // else unlockedCount = 5;
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

export const createQuiz = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const quiz = await Quiz.create(req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const getQuestions = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const questions = await QuizQuestion.find({ quizId: req.params.id });
    res.json({ success: true, data: questions });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
};

export const submitQuiz = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const quizId = req.params.id;
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { score } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const percentage = (score / quiz.totalQuestions) * 100;
    const actionType = percentage >= 70 ? 'quiz_pass' : 'quiz_fail';

    const userQuiz = await UserQuiz.create({
      userId,
      quizId,
      score,
      totalQuestions: quiz.totalQuestions,
      completedAt: new Date(),
      companyId: req.user?.companyId
    });

    await updateUserPoints(userId, actionType);

    res.json({ success: true, data: userQuiz });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};
