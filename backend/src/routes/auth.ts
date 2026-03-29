import { Router } from 'express';
import { login, register, getCurrentUser, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/refresh', refreshToken);
authRouter.get('/me', authenticate, getCurrentUser);

export default authRouter;
