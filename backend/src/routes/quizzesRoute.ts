import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { enforceQuizStart, enforceQuizComplete } from '../middleware/contentLimits.js';
import { getQuizzes, createQuiz, getQuestions, submitQuiz } from '../controllers/quizController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getQuizzes);
router.get('/:id/questions', enforceQuizStart, getQuestions);

// Creating global content library: super_admin ONLY
router.post('/', authorizeRoles('super_admin'), createQuiz);

// Completion action: any authenticated user
router.post('/:id/submit', enforceQuizComplete, submitQuiz);

export default router;