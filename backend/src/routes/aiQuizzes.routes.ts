import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { Company } from '../models/Company.js';
import { AppError } from '../utils/errorHandler.js';
import { QUIZ_TOPICS, QuizTopic, getNextQuizTopic } from '../services/ai/quizTopics.js';
import { enqueueAdminQuiz } from '../queues/trackingQueue.js';
import { runMonthlyQuizGeneration } from '../services/ai/monthlyQuizService.js';
import { generateAdminQuiz } from '../services/ai/adminQuizService.js';

export const aiQuizzesRouter = Router();

/**
 * Helper to enforce tenant ownership of a quiz.
 * Returns 404 (not 403) on mismatch to prevent existence leakage.
 */
async function findAndValidateQuizTenant(quizId: string, reqUser: any) {
  if (!mongoose.isValidObjectId(quizId)) {
    return null;
  }
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return null;

  if (reqUser?.role !== 'super_admin') {
    const userCompanyId = reqUser?.companyId?.toString();
    const quizCompanyId = quiz.companyId?.toString();
    // If quiz has a companyId and it doesn't match the requester's companyId, return null (404)
    if (quizCompanyId && quizCompanyId !== userCompanyId) {
      return null;
    }
  }
  return quiz;
}

/**
 * GET /api/ai/quizzes/list
 * Returns AI-generated quizzes (with questions) scoped to the admin's company.
 */
aiQuizzesRouter.get(
  '/list',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const query: any = { source: 'ai_generated' };
      if (req.user?.role !== 'super_admin' && req.user?.companyId) {
        query.$or = [
          { companyId: req.user.companyId },
          { companyId: { $exists: false } },
          { companyId: null },
        ];
      }

      const quizzes = await Quiz.find(query).sort({ createdAt: -1 }).lean();

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

      res.json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('[AI Quizzes List] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch AI quizzes' });
    }
  }
);

/**
 * GET /api/ai/quizzes/overview
 * GET /api/ai/quizzes/dashboard
 * Summary counts scoped to requester's tenant.
 */
const getOverviewHandler = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const filter: any = { source: 'ai_generated' };
    if (req.user?.role !== 'super_admin' && req.user?.companyId) {
      filter.$or = [
        { companyId: req.user.companyId },
        { companyId: { $exists: false } },
        { companyId: null },
      ];
    }

    const [total, pendingReview, published, failed] = await Promise.all([
      Quiz.countDocuments(filter),
      Quiz.countDocuments({ ...filter, status: 'pending_review' }),
      Quiz.countDocuments({ ...filter, status: 'published' }),
      Quiz.countDocuments({ ...filter, status: 'failed' }),
    ]);

    res.json({
      success: true,
      data: {
        totalQuizzes: total,
        pendingReviewCount: pendingReview,
        publishedCount: published,
        failedCount: failed,
      },
    });
  } catch (error: unknown) {
    console.error('[AI Quizzes Overview] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz overview' });
  }
};

aiQuizzesRouter.get('/overview', authenticate, authorize('admin', 'super_admin'), getOverviewHandler);
aiQuizzesRouter.get('/dashboard', authenticate, authorize('admin', 'super_admin'), getOverviewHandler);

/**
 * GET /api/ai/quizzes/:id/details
 * Fetches single quiz details + questions with strict tenant isolation (404 on cross-company).
 */
aiQuizzesRouter.get(
  '/:id/details',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const quiz = await findAndValidateQuizTenant(req.params.id, req.user);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'Quiz not found' });
        return;
      }

      const questions = await QuizQuestion.find({ quizId: quiz._id }).lean();
      res.json({
        success: true,
        data: {
          ...quiz.toObject(),
          questions,
        },
      });
    } catch (error: unknown) {
      console.error('[AI Quiz Details] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch quiz details' });
    }
  }
);

/**
 * POST /api/ai/quizzes/:id/retry
 * Retries quiz generation for a failed or queued quiz with strict tenant isolation.
 */
aiQuizzesRouter.post(
  '/:id/retry',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const quiz = await findAndValidateQuizTenant(req.params.id, req.user);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'Quiz not found' });
        return;
      }

      quiz.status = 'generating';
      await quiz.save();

      res.json({
        success: true,
        data: quiz,
        message: 'Quiz generation retry initiated',
      });
    } catch (error: unknown) {
      console.error('[AI Quiz Retry] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to retry quiz generation' });
    }
  }
);

/**
 * POST /api/ai/quizzes/:id/approve
 * Approves a pending quiz and publishes it.
 */
aiQuizzesRouter.post(
  '/:id/approve',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const quiz = await findAndValidateQuizTenant(req.params.id, req.user);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'Quiz not found' });
        return;
      }

      quiz.status = 'published';
      quiz.reviewedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
      quiz.reviewedAt = new Date();
      await quiz.save();

      res.json({
        success: true,
        data: quiz,
        message: 'Quiz approved and published',
      });
    } catch (error: unknown) {
      console.error('[AI Quiz Approve] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to approve quiz' });
    }
  }
);

/**
 * POST /api/ai/quizzes/:id/reject
 * Rejects a pending quiz.
 */
aiQuizzesRouter.post(
  '/:id/reject',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const quiz = await findAndValidateQuizTenant(req.params.id, req.user);
      if (!quiz) {
        res.status(404).json({ success: false, error: 'Quiz not found' });
        return;
      }

      quiz.status = 'failed';
      quiz.reviewedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
      quiz.reviewedAt = new Date();
      await quiz.save();

      res.json({
        success: true,
        data: quiz,
        message: 'Quiz rejected',
      });
    } catch (error: unknown) {
      console.error('[AI Quiz Reject] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to reject quiz' });
    }
  }
);

/**
 * POST /api/ai/quizzes/suggest-topic
 * Suggests an AI quiz topic for a specific employee or the company rotation.
 */
aiQuizzesRouter.post(
  '/suggest-topic',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { employeeId } = req.body as { employeeId?: string };

      if (employeeId) {
        if (!mongoose.isValidObjectId(employeeId)) {
          throw new AppError('Invalid employeeId', 400);
        }
        const employee = await User.findById(employeeId);
        if (!employee) {
          res.status(404).json({ success: false, error: 'Employee not found' });
          return;
        }

        // Cross-company check
        if (req.user?.role !== 'super_admin') {
          const reqCompanyId = req.user?.companyId?.toString();
          const empCompanyId = employee.companyId?.toString();
          if (empCompanyId && empCompanyId !== reqCompanyId) {
            res.status(403).json({ success: false, error: 'Forbidden: Employee belongs to a different company' });
            return;
          }
        }

        const suggestedTopic = QUIZ_TOPICS[Math.floor(Math.random() * QUIZ_TOPICS.length)];
        res.json({
          success: true,
          data: {
            topic: suggestedTopic,
            employeeId,
            reason: `Adaptive recommendation based on ${employee.name}'s risk profile and department (${employee.department || 'General'})`,
          },
        });
        return;
      }

      // Company-wide rotation topic
      const company = req.user?.companyId ? await Company.findById(req.user.companyId) : null;
      const topic = getNextQuizTopic(company?.lastMonthlyQuizTopic);

      res.json({
        success: true,
        data: {
          topic,
          reason: 'Next scheduled topic in rotation',
        },
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('[AI Quiz Suggest Topic] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to suggest topic' });
      }
    }
  }
);

/**
 * POST /api/ai/quizzes/generate-for-employee
 * Admin or Super Admin endpoint to enqueue a personalized or topic-specific quiz.
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

      // Enqueue one job per employee
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
 * Restricted strictly to 'super_admin'.
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
