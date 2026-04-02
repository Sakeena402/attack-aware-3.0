import { Router } from 'express';
import { register } from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';
import { login, refreshToken, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '../middleware/validation.js';

const authRouter = Router();

authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshToken);
authRouter.get('/me', authenticate, getCurrentUser);

export default authRouter;
