import { Router } from 'express';
import { logout, register } from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';
import { login, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '../middleware/validation.js';

const authRouter = Router();

authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/refresh', validate(refreshTokenSchema));
authRouter.get('/me', authenticate, getCurrentUser);
authRouter.post('/logout', authenticate, logout);

import { forgotPassword, resetPassword, sendCredentials } from '../controllers/authController.js';
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/send-credentials', authenticate, sendCredentials);

export default authRouter;



