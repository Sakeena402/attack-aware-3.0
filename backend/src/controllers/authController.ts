import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';

// ✅ FIX: import generateRefreshToken and verifyRefreshToken alongside generateToken
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

import { validateLoginRequest, validateRegisterRequest, sanitizeEmail } from '../utils/validators.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, LoginRequest, RegisterRequest, ApiResponse } from '../types/index.js';

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export const login = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    const validation = validateLoginRequest(email, password);
    if (!validation.valid) {
      throw new AppError(validation.error || 'Validation failed', 400);
    }

    const sanitizedEmail = sanitizeEmail(email);

    // ✅ FIX: .select('+passwordHash') ensures Mongoose returns the hash field
    const user = await User.findOne({ email: sanitizedEmail }).select('+passwordHash');

    // ✅ DEBUG: remove these two lines once login is confirmed working
    console.log('User found:', user?.email);
    console.log('passwordHash exists:', !!user?.passwordHash);

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // ✅ FIX: generate refreshToken in login (was missing before)
    const token = generateToken(user._id.toString(), user.email, user.role);
    const refreshToken = generateRefreshToken(user._id.toString(), user.email, user.role);

    user.lastLogin = new Date();
    await user.save();

    // ✅ FIX: include refreshToken in response so frontend authContext gets it
    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }
};

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
export const register = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as RegisterRequest;

    const validation = validateRegisterRequest(name, email, password);
    if (!validation.valid) {
      throw new AppError(validation.error || 'Validation failed', 400);
    }

    const sanitizedEmail = sanitizeEmail(email);
    const existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // ✅ Hash the password before saving
    const passwordHash = await bcryptjs.hash(password, 10);

    const newUser = new User({
      name,
      email: sanitizedEmail,
      passwordHash,
      role: role || 'employee',
      department: 'General',
    });

    await newUser.save();

    const token = generateToken(newUser._id.toString(), newUser.email, newUser.role);
    const refreshToken = generateRefreshToken(newUser._id.toString(), newUser.email, newUser.role);

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }
};

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // ✅ -passwordHash is correct here — we never return the hash to the client
    const user = await User.findById(req.user.id).select('-passwordHash');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        department: user.department,
        points: user.points,
        badge: user.badge,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  }
};

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────
export const refreshToken = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newToken = generateToken(user._id.toString(), user.email, user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.role);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          department: user.department,
          points: user.points,
          badge: user.badge,
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
  }
};