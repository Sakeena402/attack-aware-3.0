// backend/src/controllers/authController.ts
import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User.js';
import Otp from '../models/Otp.js';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateOtpTempToken,
  verifyOtpTempToken,
} from '../utils/jwt.js';
import { validateLoginRequest, validateRegisterRequest, sanitizeEmail } from '../utils/validators.js';
import { AppError } from '../utils/errorHandler.js';
import {
  AuthRequest,
  LoginRequest,
  LoginOtpVerifyBody,
  LoginOtpResendBody,
  SignupOtpVerifyBody,
  ResendSignupOtpBody,
  Toggle2FABody,
  RegisterRequest,
  ApiResponse,
} from '../types/index.js';
import { createOtpRecord, verifyOtp as verifyOtpCode } from '../services/otpService.js';
import { sendOtpEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ─── Cookie Options ───────────────────────────────────────────────────────────

const COOKIE_OPTS_ACCESS = {
  httpOnly: true,
  secure: true, // Required for SameSite=None
  sameSite: 'none' as const, // Required for cross-origin (vercel.app → onrender.com)
  maxAge: 60 * 60 * 1000, // 1 hour
};

const COOKIE_OPTS_REFRESH = {
  httpOnly: true,
  secure: true, // Required for SameSite=None
  sameSite: 'none' as const, // Required for cross-origin (vercel.app → onrender.com)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUserPayload(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    department: user.department,
    points: user.points,
    badge: user.badge ?? 'Rookie',
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    emailVerified: user.emailVerified ?? false,
  };
}

/** Issues real JWT cookies and updates lastLogin. Shared by login() and verifyOtp(). */
async function completeLogin(user: InstanceType<typeof User>, res: Response<ApiResponse>) {
  const companyId = user.companyId?.toString();
  const accessToken  = generateToken(user._id.toString(), user.email, user.role, companyId);
  const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, companyId);

  res.cookie('accessToken',  accessToken,  COOKIE_OPTS_ACCESS);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS_REFRESH);

  user.lastLogin = new Date();
  await user.save();

  res.json({ success: true, data: { user: buildUserPayload(user) } });
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Creates a user with emailVerified: false and sends a signup OTP.
 * Does NOT issue a JWT — the client must call verify-signup-otp next.
 */
export const register = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { name, email, password } = req.body as RegisterRequest;

    const validation = validateRegisterRequest(name, email, password);
    if (!validation.valid) throw new AppError(validation.error || 'Validation failed', 400);

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) throw new AppError('Email sanitization failed', 500);

    if (await User.findOne({ email: sanitizedEmail }))
      throw new AppError('Email already registered', 409);

    const passwordHash = await bcryptjs.hash(password, 10);
    const newUser = new User({
      name,
      email: sanitizedEmail,
      passwordHash,
      role: 'individual',
      department: 'General',
      emailVerified: false,       // ← must verify email before getting a session
      twoFactorEnabled: false,
    });
    await newUser.save();

    // Create and send the signup OTP (pass userId now that the user exists)
    const { code } = await createOtpRecord({
      email: sanitizedEmail,
      userId: newUser._id.toString(),
      purpose: 'signup_verification',
    });

    await sendOtpEmail({ to: sanitizedEmail, code, purpose: 'signup_verification' });

    // ← NO JWT issued here. Client must verify email first.
    res.status(201).json({
      success: true,
      message: 'Account created. Check your email for a verification code.',
    });
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

// ─── VERIFY SIGNUP OTP ────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-signup-otp
 * Body: { email, code }
 *
 * Verifies the signup OTP; on success sets emailVerified=true and issues JWT.
 */
export const verifySignupOtp = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email, code }: SignupOtpVerifyBody = req.body;
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) throw new AppError('Invalid email', 400);

    const result = await verifyOtpCode({
      email: sanitizedEmail,
      purpose: 'signup_verification',
      submittedCode: code,
    });

    if (!result.success) {
      res.status(result.locked ? 429 : 400).json({
        success: false,
        error: result.locked
          ? 'Too many incorrect attempts. Please request a new code.'
          : 'Incorrect verification code.',
        remainingAttempts: result.remainingAttempts ?? 0,
        locked: result.locked ?? false,
      });
      return;
    }

    // Mark user as verified and issue full session
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) throw new AppError('User not found', 404);

    user.emailVerified = true;
    await user.save();

    await completeLogin(user, res);
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Signup verification failed' });
  }
};

// ─── RESEND SIGNUP OTP ────────────────────────────────────────────────────────

/**
 * POST /api/auth/resend-signup-otp
 * Body: { email }
 *
 * Resends the signup OTP (enforces 60-second cooldown inside createOtpRecord).
 */
export const resendSignupOtp = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email }: ResendSignupOtpBody = req.body;
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) throw new AppError('Invalid email', 400);

    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      // Return success to avoid user enumeration
      res.json({ success: true, message: 'If that email is registered, a code has been sent.' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ success: false, error: 'Email is already verified.' });
      return;
    }

    const { code } = await createOtpRecord({
      email: sanitizedEmail,
      userId: user._id.toString(),
      purpose: 'signup_verification',
    });

    await sendOtpEmail({ to: sanitizedEmail, code, purpose: 'signup_verification' });

    res.json({ success: true, message: 'A new verification code has been sent.' });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        retryAfterSeconds:
          typeof error.details?.retryAfterSeconds === 'number'
            ? error.details.retryAfterSeconds
            : undefined,
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to resend code' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Step 1 of the login flow.
 * - If twoFactorEnabled === false → issues JWT immediately (unchanged behavior)
 * - If twoFactorEnabled === true  → sends OTP, returns { requires2FA: true, tempToken }
 */
export const login = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    const validation = validateLoginRequest(email, password);
    if (!validation.valid) throw new AppError(validation.error || 'Validation failed', 400);

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) throw new AppError('Email sanitization failed', 500);

    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) throw new AppError('Invalid credentials', 401);
    if (!user.passwordHash) throw new AppError('User password not set properly', 500);

    // Password check FIRST — wrong password must never reach the OTP stage
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

    // If 2FA is disabled: direct login
    if (!user.twoFactorEnabled) {
      await completeLogin(user, res);
      return;
    }

    // 2FA is enabled: send OTP and return a short-lived temp token
    const { code } = await createOtpRecord({
      userId: user._id.toString(),
      email: user.email,
      purpose: 'login_verification',
    });

    await sendOtpEmail({ to: user.email, code, purpose: 'login_verification' });

    const tempToken = generateOtpTempToken(user._id.toString());

    res.status(200).json({
      success: true,
      data: { requires2FA: true, tempToken, email: user.email },
      message: 'Verification code sent to your email.',
    });
  } catch (error: unknown) {
    console.error('LOGIN ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// ─── VERIFY LOGIN OTP ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-otp
 * Body: { tempToken, code }
 *
 * Step 2 of the 2FA login flow. Verifies the OTP then completes the session.
 */
export const verifyOtp = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { tempToken, code }: LoginOtpVerifyBody = req.body;
    const tokenPayload = verifyOtpTempToken(tempToken);
    if (!tokenPayload) throw new AppError('Invalid or expired verification token.', 401);

    const user = await User.findById(tokenPayload.userId);
    if (!user || !user.twoFactorEnabled) throw new AppError('Invalid verification request.', 401);

    const result = await verifyOtpCode({
      email: user.email,
      purpose: 'login_verification',
      submittedCode: code,
    });

    if (!result.success) {
      res.status(result.locked ? 429 : 400).json({
        success: false,
        error: result.locked
          ? 'Too many incorrect attempts. Request a new code.'
          : 'Incorrect verification code.',
        remainingAttempts: result.remainingAttempts ?? 0,
        locked: result.locked ?? false,
      });
      return;
    }

    await completeLogin(user, res);
  } catch (error: unknown) {
    console.error('VERIFY OTP ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

// ─── RESEND LOGIN OTP ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/resend-otp
 * Body: { tempToken }
 *
 * Resends the login OTP and issues a fresh tempToken.
 */
export const resendOtp = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { tempToken }: LoginOtpResendBody = req.body;
    const tokenPayload = verifyOtpTempToken(tempToken);
    if (!tokenPayload) throw new AppError('Invalid or expired verification token.', 401);

    const user = await User.findById(tokenPayload.userId);
    if (!user || !user.twoFactorEnabled) throw new AppError('Invalid verification request.', 401);

    const { code } = await createOtpRecord({
      userId: user._id.toString(),
      email: user.email,
      purpose: 'login_verification',
    });

    await sendOtpEmail({ to: user.email, code, purpose: 'login_verification' });

    res.json({
      success: true,
      message: 'A new verification code has been sent.',
      data: { tempToken: generateOtpTempToken(user._id.toString()) },
    });
  } catch (error: unknown) {
    console.error('RESEND OTP ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        retryAfterSeconds:
          typeof error.details?.retryAfterSeconds === 'number'
            ? error.details.retryAfterSeconds
            : undefined,
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to resend code' });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: buildUserPayload(user) });
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

export const refreshTokenHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const token = req.cookies.refreshToken as string | undefined;
    if (!token) throw new AppError('Refresh token missing', 401);

    const decoded = verifyRefreshToken(token);
    if (!decoded) throw new AppError('Invalid or expired refresh token', 401);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);

    const companyId = user.companyId?.toString();
    const newAccessToken  = generateToken(user._id.toString(), user.email, user.role, companyId);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, companyId);

    res.cookie('accessToken',  newAccessToken,  COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS_REFRESH);

    res.json({ success: true, data: { user: buildUserPayload(user) } });
  } catch (error: unknown) {
    console.error('REFRESH ERROR:', error);
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(401).json({ success: false, error: 'Token refresh failed' });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export const logout = (_req: AuthRequest, res: Response<ApiResponse>) => {
  res.clearCookie('accessToken',  COOKIE_OPTS_ACCESS);
  res.clearCookie('refreshToken', COOKIE_OPTS_REFRESH);
  res.json({ success: true });
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

export const forgotPassword = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email) throw new AppError('Please provide an email address', 400);

    const user = await User.findOne({ email });
    if (!user) throw new AppError('There is no user with this email address', 404);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    console.log(`[EMAIL MOCK] To: ${user.email}, Subject: Password Reset, Body: Your reset token is ${resetToken}`);

    res.json({ success: true, message: 'Token sent to email!' });
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Error processing forgot password' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

export const resetPassword = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) throw new AppError('Please provide token and new password', 400);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw new AppError('Token is invalid or has expired', 400);

    user.passwordHash = await bcryptjs.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Error resetting password' });
  }
};

// ─── SEND CREDENTIALS (admin) ─────────────────────────────────────────────────

export const sendCredentials = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }

    const { employeeId, newPassword } = req.body as { employeeId: string; newPassword: string };
    if (!employeeId || !newPassword) throw new AppError('Provide employeeId and newPassword', 400);

    const query: Record<string, unknown> = { _id: employeeId };
    if (req.user.role === 'admin') {
      query.companyId = req.user.companyId;
    }

    const employee = await User.findOne(query);
    if (!employee) throw new AppError('Employee not found or access denied', 404);

    employee.passwordHash = await bcryptjs.hash(newPassword, 10);
    await employee.save();

    console.log(`[EMAIL MOCK] To: ${employee.email}, Subject: Your new login credentials, Body: Your new password is ${newPassword}`);

    res.json({ success: true, message: 'Credentials sent to employee' });
  } catch (error: unknown) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Error sending credentials' });
  }
};

// ─── TOGGLE 2FA ───────────────────────────────────────────────────────────────

/**
 * PATCH /api/users/me/2fa
 * Body: { enable: boolean, code?: string, password?: string }
 *
 * Enabling (enable: true):
 *   Phase 1 — no code in body → generate OTP, email it, return { otpSent: true }
 *   Phase 2 — code in body   → verify OTP, on success set twoFactorEnabled: true
 *
 * Disabling (enable: false):
 *   Requires current password in body
 *   On success: set twoFactorEnabled: false, delete any pending login OTP records
 */
export const toggle2FA = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Not authenticated', 401);

    const { enable, code, password }: Toggle2FABody = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('User not found', 404);

    // ── Enabling ──────────────────────────────────────────────────────────────
    if (enable) {
      if (!code) {
        // Phase 1: send OTP
        const { code: otpCode } = await createOtpRecord({
          email: user.email,
          userId: user._id.toString(),
          purpose: 'signup_verification',  // reuse signup_verification purpose for 2FA enable
        });

        await sendOtpEmail({ to: user.email, code: otpCode, purpose: 'signup_verification' });

        res.json({ success: true, data: { otpSent: true }, message: 'Verification code sent to your email.' });
        return;
      }

      // Phase 2: verify OTP
      const result = await verifyOtpCode({
        email: user.email,
        purpose: 'signup_verification',
        submittedCode: code,
      });

      if (!result.success) {
        res.status(result.locked ? 429 : 400).json({
          success: false,
          error: result.locked
            ? 'Too many incorrect attempts. Request a new code.'
            : 'Incorrect verification code.',
          remainingAttempts: result.remainingAttempts ?? 0,
        });
        return;
      }

      user.twoFactorEnabled = true;
      await user.save();

      res.json({ success: true, message: '2FA has been enabled for your account.' });
      return;
    }

    // ── Disabling ─────────────────────────────────────────────────────────────
    if (!password) {
      throw new AppError('Current password is required to disable 2FA.', 400);
    }

    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new AppError('Incorrect password.', 401);

    user.twoFactorEnabled = false;
    await user.save();

    // Clean up any pending login OTP records for this user
    await Otp.deleteMany({ email: user.email, purpose: 'login_verification' });

    res.json({ success: true, message: '2FA has been disabled for your account.' });
  } catch (error: unknown) {
    console.error('TOGGLE 2FA ERROR:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        retryAfterSeconds:
          typeof error.details?.retryAfterSeconds === 'number'
            ? error.details.retryAfterSeconds
            : undefined,
      });
      return;
    }
    res.status(500).json({ success: false, error: '2FA toggle failed' });
  }
};