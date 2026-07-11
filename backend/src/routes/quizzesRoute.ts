import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getQuizzes, createQuiz, getQuestions, submitQuiz } from '../controllers/quizController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getQuizzes);
router.get('/:id/questions', getQuestions);

// Creating global content library: super_admin ONLY
router.post('/', authorizeRoles('super_admin'), createQuiz);

// Completion action: any authenticated user
router.post('/:id/submit', submitQuiz);

export default router;
