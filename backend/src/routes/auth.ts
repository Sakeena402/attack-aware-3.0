import { Router } from 'express';
import {
  logout,
  register,
  resendOtp,
  verifyOtp,
  login,
  getCurrentUser,
  refreshTokenHandler,
  forgotPassword,
  resetPassword,
  sendCredentials,
  verifySignupOtp,
  resendSignupOtp,
} from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginSchema,
  registerSchema,
  loginOtpVerifySchema,
  loginOtpResendSchema,
  signupOtpVerifySchema,
  signupOtpResendSchema,
} from '../middleware/validation.js';
import { otpRateLimiter, authRateLimiter } from '../middleware/security.js';

const authRouter = Router();

// ── Core auth ──────────────────────────────────────────────────────────────────
authRouter.post('/login',    authRateLimiter, validate(loginSchema),    login);
authRouter.post('/register', authRateLimiter, validate(registerSchema), register);
authRouter.post('/refresh',  refreshTokenHandler);                        // reads cookie, no body schema needed
authRouter.get( '/me',       authenticate, getCurrentUser);
authRouter.post('/logout',   authenticate, logout);

// ── Password reset ─────────────────────────────────────────────────────────────
authRouter.post('/forgot-password',   forgotPassword);
authRouter.post('/reset-password',    resetPassword);
authRouter.post('/send-credentials',  authenticate, sendCredentials);

// ── Login 2FA (step 2 — verify OTP from login flow) ───────────────────────────
authRouter.post('/verify-otp',  otpRateLimiter, validate(loginOtpVerifySchema),  verifyOtp);
authRouter.post('/resend-otp',  otpRateLimiter, validate(loginOtpResendSchema),  resendOtp);

// ── Signup email verification ──────────────────────────────────────────────────
authRouter.post('/verify-signup-otp', otpRateLimiter, validate(signupOtpVerifySchema), verifySignupOtp);
authRouter.post('/resend-signup-otp', otpRateLimiter, validate(signupOtpResendSchema), resendSignupOtp);

export default authRouter;
