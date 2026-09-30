import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Quiz } from '../models/Quiz.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { UserQuiz } from '../models/UserQuiz.js';
import { updateUserPoints } from '../services/analyticsService.js';
import { completeLinkedTasks } from '../services/taskService.js';
import { awardMonthlyPoints } from '../services/pointsGuard.js';
import { getOpenCounts } from '../services/contentAccessService.js';
import { AppError } from '../utils/errorHandler.js';

import { Company } from '../models/Company.js';

/**
 * A quiz with a companyId (AI-generated) is only visible to that company and super_admin.
 * Quizzes without a companyId (the static library) are visible to everyone.
 */
function canAccessQuiz(quiz: { companyId?: unknown }, user: AuthRequest['user']): boolean {
  if (user?.role === 'super_admin') return true;
  if (!quiz.companyId) return true;
  return String(quiz.companyId) === String(user?.companyId ?? '');
}

export const getQuizzes = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    // AI-generated quizzes are company-specific and are listed in the admin's AI Quizzes tab,
    // so the general library only returns static quizzes.
    const quizzes = await Quiz.find({ source: { $ne: 'ai_generated' } }).sort({ order: 1 });

    let isUnlocked = req.user?.role === 'super_admin' || req.user?.role === 'admin';

    if (!isUnlocked && req.user?.companyId) {
      const company = await Company.findById(req.user.companyId).populate('subscriptionPlan');
      if (company?.subscriptionPlan && company.approvalStatus === 'approved') {
        isUnlocked = true;
      }
    }

    // Not unlocked through a company plan: open the first N quizzes (N depends on the plan)
    const open = isUnlocked ? null : await getOpenCounts(req.user);

    const withLockStatus = quizzes.map((q, index) => ({
      ...q.toObject(),
      isLocked: open ? index >= open.quizzes : false,
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
    const quiz = await Quiz.findById(req.params.id).select('companyId').lean();
    // 404 (not 403) so another company's quiz ids cannot be probed
    if (!quiz || !canAccessQuiz(quiz, req.user)) {
      res.status(404).json({ success: false, error: 'Quiz not found' });
      return;
    }

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
    if (!quiz || !canAccessQuiz(quiz, req.user)) throw new AppError('Quiz not found', 404);

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

    // Points only for the first submission of this quiz each month
    const pointsGiven = await awardMonthlyPoints(userId, 'quiz', quizId, () =>
      updateUserPoints(userId, actionType as any)
    );

    await completeLinkedTasks(userId, 'quiz', quizId);

    res.json({
      success: true,
      data: { score, totalQuestions, passed, pointsEarned: pointsGiven ? pointsEarned : 0 },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};