import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { enforceQuizStart, enforceQuizComplete } from '../middleware/contentLimits.js';
import { getQuizzes, getMyQuizzes, createQuiz, getQuestions, getQuizForPlay, submitQuiz } from '../controllers/quizController.js';

const router = Router();
router.use(authenticate);

// Reading: any authenticated user
router.get('/', getQuizzes);
// Mobile learner API: adaptive quizzes made for the signed-in user
router.get('/mine', getMyQuizzes);
router.get('/:id/questions', enforceQuizStart, getQuestions);
// Same checks as /questions, but never sends correct answers or explanations
router.get('/:id/play', enforceQuizStart, getQuizForPlay);

// Creating global content library: super_admin ONLY
router.post('/', authorizeRoles('super_admin'), createQuiz);

// Completion action: any authenticated user
router.post('/:id/submit', enforceQuizComplete, submitQuiz);

export default router;