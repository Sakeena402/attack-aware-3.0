import { Response } from 'express';
import bcryptjs from 'bcryptjs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { validateLoginRequest, validateRegisterRequest, sanitizeEmail } from '../utils/validators.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, LoginRequest, RegisterRequest, ApiResponse } from '../types/index.js';

// export const login = async (
//   req: AuthRequest,
//   res: Response<ApiResponse>
// ): Promise<void> => {
//   try {
//     const { email, password } = req.body as LoginRequest;

//     const validation = validateLoginRequest(email, password);
//     if (!validation.valid) {
//       throw new AppError(validation.error || 'Validation failed', 400);
//     }

//     const sanitizedEmail = sanitizeEmail(email);
//     console.log('Sanitized email:', sanitizedEmail);
//     const user = await User.findOne({ email: sanitizedEmail });

//     if (!user) {
//       throw new AppError('Invalid credentials', 401);
//     }

//     const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
//     if (!isPasswordValid) {
//       throw new AppError('Invalid credentials', 401);
//     }

//     let token, refreshToken;
// try {
//   token = generateToken(user._id.toString(), user.email, user.role);
//   refreshToken = generateRefreshToken(user._id.toString(), user.email, user.role);
// } catch (err) {
//   throw new AppError('Token generation failed', 500);
// }
//   console.log('Login payload:', req.body);
// console.log('Sanitized email:', sanitizedEmail);
// console.log('User found:', user);
//     user.lastLogin = new Date();
//     await user.save();

//     console.log('Login payload:', req.body);
// console.log('Sanitized email:', sanitizedEmail);
// console.log('User found:', user);
//     res.json({
//       success: true,
//       data: {
//         token,
//         refreshToken,
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           companyId: user.companyId,
//           department: user.department,
//           points: user.points,
//           badge: user.badges[0] || null,
//         },
//       },
//     });
//   } catch (error) {
//     if (error instanceof AppError) {
//       res.status(error.statusCode).json({ success: false, error: error.message });
//     } else {
//       res.status(500).json({ success: false, error: 'Login failed' });
//     }
//   }
// };


export const login = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    console.log('🔵 STEP 1: Incoming request body:', req.body);

    const { email, password } = req.body as LoginRequest;

    console.log('🔵 STEP 2: Extracted email & password:', { email, password });

    // ✅ Validate input
    const validation = validateLoginRequest(email, password);
    if (!validation.valid) {
      console.log('❌ STEP 3: Validation failed:', validation.error);
      throw new AppError(validation.error || 'Validation failed', 400);
    }

    // ✅ Sanitize email
    const sanitizedEmail = sanitizeEmail(email);
    console.log('🔵 STEP 4: Sanitized email:', sanitizedEmail);

    if (!sanitizedEmail || typeof sanitizedEmail !== 'string') {
      throw new AppError('Email sanitization failed', 500);
    }

    // ✅ Find user
    const user = await User.findOne({ email: sanitizedEmail });
    console.log('🔵 STEP 5: User query result:', user);

    if (!user) {
      console.log('❌ STEP 6: User not found');
      throw new AppError('Invalid credentials', 401);
    }

    // ✅ Check passwordHash exists
    if (!user.passwordHash) {
      console.log('❌ STEP 7: passwordHash missing in DB');
      throw new AppError('User password not set properly', 500);
    }

    console.log('🔵 STEP 8: Comparing passwords...');

    // ✅ Compare password
    const isPasswordValid = await bcryptjs.compare(
      password,
      user.passwordHash
    );

    console.log('🔵 STEP 9: Password valid?', isPasswordValid);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // ✅ Generate tokens
    let token: string;
    let refreshToken: string;

    try {
      console.log('🔵 STEP 10: Generating tokens...');
      token = generateToken(
        user._id.toString(),
        user.email,
        user.role
      );

      refreshToken = generateRefreshToken(
        user._id.toString(),
        user.email,
        user.role
      );

      console.log('✅ STEP 11: Tokens generated');
    } catch (err: any) {
      console.error('🔥 TOKEN ERROR:', err);
      throw new AppError('Token generation failed', 500);
    }

    // ✅ Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ STEP 12: User login successful');

    // ✅ Response
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
          department: user.department,
          points: user.points,
          badge: user.badges?.[0] || null,
        },
      },
    });

  } catch (error: any) {
    console.error('🔥 LOGIN ERROR FULL:', error);
    console.error('🔥 STACK TRACE:', error?.stack);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error?.message || 'Login failed',
      });
    }
  }
};
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
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

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
        badge: user.badges[0] || null,
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

// export const refreshToken = async (
//   req: AuthRequest,
//   res: Response<ApiResponse>
// ): Promise<void> => {
//   try {
//     const { refreshToken: token } = req.body;

//     if (!token) {
//       throw new AppError('Refresh token required', 400);
//     }

//     const decoded = verifyRefreshToken(token);
//     if (!decoded) {
//       throw new AppError('Invalid or expired refresh token', 401);
//     }

//     const user = await User.findById(decoded.id).select('-passwordHash');
//     if (!user) {
//       throw new AppError('User not found', 404);
//     }

//     const newToken = generateToken(user._id.toString(), user.email, user.role);
//     const newRefreshToken = generateRefreshToken(user._id.toString(), user.email, user.role);

//     res.json({
//       success: true,
//       data: {
//         token: newToken,
//         refreshToken: newRefreshToken,
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           companyId: user.companyId,
//           department: user.department,
//           points: user.points,
//           badge: user.badges[0] || null,
//         },
//       },
//     });
//   } catch (error) {
//     if (error instanceof AppError) {
//       res.status(error.statusCode).json({ success: false, error: error.message });
//     } else {
//       res.status(500).json({ success: false, error: 'Token refresh failed' });
//     }
//   }
// };


export const refreshToken = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      throw new AppError('Refresh token missing', 401);
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

    // ✅ rotate refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          department: user.department,
          points: user.points,
          badge: user.badges?.[0] || null,
        },
      },
    });
  } catch (error: any) {
    console.error('🔥 REFRESH ERROR:', error);

    res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed',
    });
  }
};