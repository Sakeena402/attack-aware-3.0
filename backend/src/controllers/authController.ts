// backend/src/controllers/authController.ts
import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { validateLoginRequest, validateRegisterRequest, sanitizeEmail } from '../utils/validators.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, LoginRequest, RegisterRequest, ApiResponse } from '../types/index.js';

const COOKIE_OPTS_ACCESS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 1000, // 15 minutes
};

const COOKIE_OPTS_REFRESH = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

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
  };
}

// ------------------- LOGIN -------------------
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

    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

    const accessToken = generateToken(user._id.toString(), user.email, user.role, user.companyId?.toString());
    const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, user.companyId?.toString());

    res.cookie('accessToken', accessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS_REFRESH);

    user.lastLogin = new Date();
    await user.save();

    // Only user data is returned — tokens live exclusively in httpOnly cookies
    res.json({
      success: true,
      data: { user: buildUserPayload(user) },
    });
  } catch (error: any) {
    console.error('LOGIN ERROR:', error);
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: error?.message || 'Login failed' });
  }
};

// ------------------- REGISTER -------------------
export const register = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { name, email, password, role: _role } = req.body as RegisterRequest;

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
      // Public self-registration always creates an 'individual' account.
      // Employees are created by a company admin via POST /api/employees.
      role: 'individual',
      department: 'General',
    });
    await newUser.save();

    const newAccessToken = generateToken(
      newUser._id.toString(), 
      newUser.email,
      newUser.role, // Now 'admin'
      newUser.companyId?.toString() // Now newCompany._id
    );const newRefreshToken = generateRefreshToken(
      newUser._id.toString(), 
      newUser.email,
      newUser.role, // Now 'admin'
      newUser.companyId?.toString() // Now newCompany._id
    );res.cookie('accessToken', newAccessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS_REFRESH);

    res.status(201).json({
      success: true,
      data: { user: buildUserPayload(newUser) },
    });
  } catch (error: any) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

// ------------------- GET CURRENT USER (/auth/me) -------------------
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);

    // Shape matches AuthResponse.user on the frontend
    res.json({
      success: true,
      data: buildUserPayload(user),
    });
  } catch (error: any) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

// ------------------- REFRESH TOKEN -------------------
export const refreshTokenHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    // The refreshToken cookie is read from the request automatically — no body needed
    const token = req.cookies.refreshToken;
    if (!token) throw new AppError('Refresh token missing', 401);

    const decoded = verifyRefreshToken(token);
    if (!decoded) throw new AppError('Invalid or expired refresh token', 401);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);

    const newAccessToken = generateToken(user._id.toString(), user.email, user.role, user.companyId?.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, user.companyId?.toString());

    // Rotate both cookies
    res.cookie('accessToken', newAccessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS_REFRESH);

    res.json({
      success: true,
      data: { user: buildUserPayload(user) },
    });
  } catch (error: any) {
    console.error('REFRESH ERROR:', error);
    res.status(401).json({ success: false, error: error.message || 'Token refresh failed' });
  }
};

// ------------------- LOGOUT -------------------
export const logout = (_req: AuthRequest, res: Response<ApiResponse>) => {
  res.clearCookie('accessToken', COOKIE_OPTS_ACCESS);
  res.clearCookie('refreshToken', COOKIE_OPTS_REFRESH);
  res.json({ success: true });
};

import crypto from 'crypto';

// ------------------- FORGOT PASSWORD -------------------
export const forgotPassword = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Please provide an email address', 400);

    const user = await User.findOne({ email });
    if (!user) throw new AppError('There is no user with this email address', 404);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Mock sending email (since no mail setup found)
    console.log(`[EMAIL MOCK] To: ${user.email}, Subject: Password Reset, Body: Your reset token is ${resetToken}`);

    res.json({ success: true, message: 'Token sent to email!' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Error processing forgot password' });
  }
};

// ------------------- RESET PASSWORD -------------------
export const resetPassword = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Please provide token and new password', 400);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) throw new AppError('Token is invalid or has expired', 400);

    user.passwordHash = await bcryptjs.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Error resetting password' });
  }
};

// ------------------- SEND CREDENTIALS -------------------
export const sendCredentials = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }

    const { employeeId, newPassword } = req.body;
    if (!employeeId || !newPassword) throw new AppError('Provide employeeId and newPassword', 400);

    const query: any = { _id: employeeId };
    if (req.user.role === 'admin') {
      query.companyId = req.user.companyId;
    }

    const employee = await User.findOne(query);
    if (!employee) throw new AppError('Employee not found or access denied', 404);

    employee.passwordHash = await bcryptjs.hash(newPassword, 10);
    await employee.save();

    // Mock sending email
    console.log(`[EMAIL MOCK] To: ${employee.email}, Subject: Your new login credentials, Body: Your new password is ${newPassword}`);

    res.json({ success: true, message: 'Credentials sent to employee' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Error sending credentials' });
  }
};