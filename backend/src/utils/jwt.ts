//backend/src/utils/jwt.ts

import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { JwtPayload, OtpTempTokenPayload, UserRole } from '../types/index.js';

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as Secret;
const REFRESH_SECRET = (process.env.REFRESH_SECRET || 'refresh-secret-key-change-in-production') as Secret;
// TEMP_JWT_SECRET must be a separate secret — never shared with JWT_SECRET.
// Used only for short-lived (5-min) 2FA intermediate tokens.
const OTP_TEMP_SECRET = (
  process.env.TEMP_JWT_SECRET ||
  (() => { console.warn('[JWT] TEMP_JWT_SECRET is not set — using JWT_SECRET as fallback. Set it in .env!'); return process.env.JWT_SECRET || 'temp-fallback'; })()
) as Secret;
const JWT_EXPIRY = (process.env.JWT_EXPIRY || '15m') as SignOptions['expiresIn'];
const REFRESH_EXPIRY = (process.env.REFRESH_EXPIRY || '7d') as SignOptions['expiresIn'];

export const generateToken = (
  id: string,
  email: string,
  role: UserRole,
  companyId?: string
): string => {
  return jwt.sign(
    { id, email, role, companyId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY as any }
  );
};;

export const generateRefreshToken = (id: string, email: string, role: UserRole,companyId?: string): string => {
  return jwt.sign(
    { id, email, role, companyId } as JwtPayload,
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY as any }
  );
};

export const generateOtpTempToken = (userId: string): string =>
  jwt.sign(
    { userId, purpose: 'login_verification' } satisfies OtpTempTokenPayload,
    OTP_TEMP_SECRET as Secret,
    { expiresIn: '5m' as SignOptions['expiresIn'] }
  );

export const verifyOtpTempToken = (token: string): OtpTempTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, OTP_TEMP_SECRET);
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'userId' in decoded &&
      typeof decoded.userId === 'string' &&
      'purpose' in decoded &&
      decoded.purpose === 'login_verification'
    ) {
      return decoded as OtpTempTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('[v0] JWT verification error:', error);
    return null;
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};
