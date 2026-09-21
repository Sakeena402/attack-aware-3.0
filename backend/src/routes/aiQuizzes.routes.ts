import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { AppError } from '../utils/errorHandler.js';
import { QUIZ_TOPICS, QuizTopic } from '../services/ai/quizTopics.js';
import { enqueueAdminQuiz } from '../queues/trackingQueue.js';
import { runMonthlyQuizGeneration } from '../services/ai/monthlyQuizService.js';

export const aiQuizzesRouter = Router();

/**
 * GET /api/ai/quizzes/list
 * Returns AI-generated quizzes (with their questions) for the admin's company.
 * Used by the Training page "AI Quizzes" tab.
 */
aiQuizzesRouter.get(
  '/list',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const companyFilter =
        req.user?.role === 'super_admin' ? {} : {};

      // AI quizzes don't have a companyId on the Quiz model itself — they are linked via Task.
      // We return all ai_generated quizzes; admins see them all since they are company-wide.
      const quizzes = await Quiz.find({ source: 'ai_generated' })
        .sort({ createdAt: -1 })
        .lean();

      // Attach questions to each quiz
      const quizIds = quizzes.map((q) => q._id);
      const allQuestions = await QuizQuestion.find({ quizId: { $in: quizIds } }).lean();

      const questionsByQuiz = new Map<string, typeof allQuestions>();
      for (const question of allQuestions) {
        const key = question.quizId?.toString() ?? '';
        if (!questionsByQuiz.has(key)) questionsByQuiz.set(key, []);
        questionsByQuiz.get(key)!.push(question);
      }

      const result = quizzes.map((quiz) => ({
        ...quiz,
        questions: questionsByQuiz.get(quiz._id.toString()) ?? [],
      }));

      void companyFilter; // unused — kept for future tenant scoping
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[AI Quizzes List] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch AI quizzes' });
    }
  }
);

/**
 * POST /api/ai/quizzes/generate-for-employee
 * Admin or Super Admin endpoint to enqueue a personalized or topic-specific quiz.
 * Accepts:
 *   - employeeIds: string[] — one or more specific employee IDs
 *   - employeeIds: 'all'   — generate for ALL employees in requester's company
 */
aiQuizzesRouter.post(
  '/generate-for-employee',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { employeeIds, topicMode, topic, dueInDays } = req.body as {
        employeeIds?: string[] | 'all';
        topicMode?: 'manual' | 'auto';
        topic?: QuizTopic;
        dueInDays?: number;
      };

      if (!employeeIds || (employeeIds !== 'all' && (!Array.isArray(employeeIds) || employeeIds.length === 0))) {
        throw new AppError('employeeIds is required (array of IDs or "all")', 400);
      }

      if (!topicMode || (topicMode !== 'manual' && topicMode !== 'auto')) {
        throw new AppError("topicMode must be 'manual' or 'auto'", 400);
      }

      if (topicMode === 'manual') {
        if (!topic || !QUIZ_TOPICS.includes(topic as QuizTopic)) {
          throw new AppError(
            `topic is required when topicMode is 'manual' and must be one of: ${QUIZ_TOPICS.join(', ')}`,
            400
          );
        }
      }

      const requesterId = req.user?.id;
      if (!requesterId) throw new AppError('Unauthorized', 401);

      const requesterCompanyId = req.user?.companyId;

      // Resolve the list of employee IDs to enqueue
      let resolvedIds: string[];

      if (employeeIds === 'all') {
        if (!requesterCompanyId) throw new AppError('Company ID required to target all employees', 400);
        const allEmployees = await User.find({
          companyId: requesterCompanyId,
          role: { $in: ['employee', 'admin'] },
        }).select('_id').lean();
        resolvedIds = allEmployees.map((e) => e._id.toString());
        console.log(`[AI Quizzes] 📋 "all" resolved to ${resolvedIds.length} employees in company="${requesterCompanyId}"`);
      } else {
        resolvedIds = employeeIds;

        // Tenant scope check for specific IDs (non-super_admin only)
        if (req.user?.role !== 'super_admin') {
          const targetEmployees = await User.find({ _id: { $in: resolvedIds } }).select('companyId').lean();
          const outsideCompany = targetEmployees.some(
            (e) => e.companyId?.toString() !== requesterCompanyId
          );
          if (outsideCompany) {
            res.status(403).json({
              success: false,
              error: 'Forbidden: One or more employees belong to a different company',
            });
            return;
          }
        }
      }

      if (resolvedIds.length === 0) {
        throw new AppError('No employees found to generate quizzes for', 400);
      }

      // Enqueue one job per employee (fire-and-forget)
      const companyIdStr = requesterCompanyId ?? '';
      const dueInDaysVal = typeof dueInDays === 'number' && dueInDays > 0 ? dueInDays : 14;

      for (const empId of resolvedIds) {
        await enqueueAdminQuiz({
          companyId: companyIdStr,
          employeeId: empId,
          requestedBy: requesterId,
          topicMode,
          topic: topicMode === 'manual' ? topic : undefined,
          dueInDays: dueInDaysVal,
        });
      }

      console.log(`[AI Quizzes] ✅ Queued ${resolvedIds.length} quiz generation jobs | topicMode="${topicMode}"`);

      res.status(202).json({
        success: true,
        data: { queued: true, count: resolvedIds.length },
        message: `Quiz generation queued for ${resolvedIds.length} employee(s)`,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Generate Admin Quiz Error:', error);
        res.status(500).json({ success: false, error: 'Failed to queue quiz generation job' });
      }
    }
  }
);

/**
 * POST /api/ai/quizzes/trigger-monthly
 *
 * NOTE FOR FUTURE DEVELOPERS: This route is restricted strictly to 'super_admin' because
 * runMonthlyQuizGeneration() iterates across ALL companies globally in the system.
 * A company-scoped 'admin' MUST NOT be allowed to trigger global multi-tenant generation.
 */
aiQuizzesRouter.post(
  '/trigger-monthly',
  authenticate,
  authorize('super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const summary = await runMonthlyQuizGeneration();
      res.json({
        success: true,
        data: summary,
        message: `Monthly quiz generation completed for ${summary.successfulCompanies} companies`,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Trigger Monthly Quiz Error:', error);
        res.status(500).json({ success: false, error: 'Failed to execute monthly quiz generation' });
      }
    }
  }
);
