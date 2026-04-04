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
  maxAge: 15 * 60 * 1000, // 15 minutes
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
    badge: user.badges?.[0] ?? null,
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

    const accessToken = generateToken(user._id.toString(), user.email, user.role, user.companyId);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, user.companyId);

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
    const { name, email, password, role } = req.body as RegisterRequest;

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
      role: role || 'employee',
      department: 'General',
    });
    await newUser.save();

    const accessToken = generateToken(newUser._id.toString(), newUser.email, newUser.role, newUser.companyId);
    const refreshToken = generateRefreshToken(newUser._id.toString(), newUser.email, newUser.role, newUser.companyId);

    res.cookie('accessToken', accessToken, COOKIE_OPTS_ACCESS);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS_REFRESH);

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

    const newAccessToken = generateToken(user._id.toString(), user.email, user.role, user.companyId);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.role, user.companyId);

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
export const logout = (req: AuthRequest, res: Response<ApiResponse>) => {
  res.clearCookie('accessToken', COOKIE_OPTS_ACCESS);
  res.clearCookie('refreshToken', COOKIE_OPTS_REFRESH);
  res.json({ success: true });
};


