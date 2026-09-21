import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errorHandler.js';
import { QUIZ_TOPICS, QuizTopic } from '../services/ai/quizTopics.js';
import { enqueueAdminQuiz } from '../queues/trackingQueue.js';
import { runMonthlyQuizGeneration } from '../services/ai/monthlyQuizService.js';

export const aiQuizzesRouter = Router();

/**
 * POST /api/ai/quizzes/generate-for-employee
 * Admin or Super Admin endpoint to enqueue a personalized or topic-specific quiz for an employee.
 */
aiQuizzesRouter.post(
  '/generate-for-employee',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
      const { employeeId, topicMode, topic, dueInDays } = req.body as {
        employeeId?: string;
        topicMode?: 'manual' | 'auto';
        topic?: QuizTopic;
        dueInDays?: number;
      };

      if (!employeeId || typeof employeeId !== 'string') {
        throw new AppError('employeeId is required', 400);
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

      const targetEmployee = await User.findById(employeeId);
      if (!targetEmployee) {
        throw new AppError('Target employee not found', 404);
      }

      // Tenant Scope Check: Ensure non-super_admin users can only generate quizzes for employees in their own company
      if (
        req.user?.role !== 'super_admin' &&
        targetEmployee.companyId?.toString() !== req.user?.companyId?.toString()
      ) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot generate quiz for an employee in a different company',
        });
        return;
      }

      const requesterId = req.user?.id;
      if (!requesterId) {
        throw new AppError('Unauthorized', 401);
      }

      const companyIdStr = targetEmployee.companyId
        ? targetEmployee.companyId.toString()
        : req.user?.companyId || '';

      await enqueueAdminQuiz({
        companyId: companyIdStr,
        employeeId,
        requestedBy: requesterId,
        topicMode,
        topic: topicMode === 'manual' ? topic : undefined,
        dueInDays: typeof dueInDays === 'number' && dueInDays > 0 ? dueInDays : 14,
      });

      res.status(202).json({
        success: true,
        data: { queued: true },
        message: 'Quiz generation job queued successfully',
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
