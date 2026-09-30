// backend/src/services/otpService.ts
import crypto from 'crypto';
import { Types } from 'mongoose';
import Otp, { IOtp, OtpPurpose } from '../models/Otp.js';
import { AppError, ErrorCodes } from '../utils/errorHandler.js';

export const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;         // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 60 seconds

// ─── Result Types ────────────────────────────────────────────────────────────

export interface OtpVerificationResult {
  success: boolean;
  remainingAttempts?: number;
  locked?: boolean;
}

export interface CreateOtpRecordInput {
  email: string;
  userId?: string;   // optional — not present during signup_verification before user exists
  purpose: OtpPurpose;
}

export interface CreateOtpRecordResult {
  record: IOtp;
  code: string;      // raw plaintext code — caller must email this and discard immediately
}

export interface VerifyOtpInput {
  email: string;
  purpose: OtpPurpose;
  submittedCode: string;
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Cryptographically random 6-digit code.
 * Uses crypto.randomInt — NOT Math.random().
 */
export const generateOtp = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * SHA-256 hex digest of the code.
 * Synchronous — matches twilioService.hashToken exactly.
 * NEVER store the raw code; only store this hash.
 */
export const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex');

/**
 * Creates a new OTP record for the given email+purpose.
 *
 * Enforces:
 *  1. 60-second resend cooldown (throws AppError 429 with retryAfterSeconds)
 *  2. Deletes any prior record for the same email+purpose before creating a new one
 *  3. Returns the raw code so the caller can email it (record only stores the hash)
 */
export const createOtpRecord = async ({
  email,
  userId,
  purpose,
}: CreateOtpRecordInput): Promise<CreateOtpRecordResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  // Check for an active (non-expired) record to enforce the resend cooldown
  const latest = await Otp.findOne({
    email: normalizedEmail,
    purpose,
    expiresAt: { $gt: now },
  }).sort({ lastSentAt: -1 });

  if (latest) {
    const elapsed = now.getTime() - latest.lastSentAt.getTime();
    const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    if (retryAfterSeconds > 0) {
      throw new AppError(
        `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        429,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        { retryAfterSeconds }
      );
    }
  }

  // Invalidate any previous record for this email+purpose (one active code at a time)
  await Otp.deleteMany({ email: normalizedEmail, purpose });

  const code = generateOtp();
  const record = await Otp.create({
    ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
    email: normalizedEmail,
    otpHash: hashOtp(code),
    purpose,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
    maxAttempts: MAX_OTP_ATTEMPTS,
    locked: false,
    lastSentAt: now,
  });

  return { record, code };
};

/**
 * Verifies a submitted 6-digit code against the stored hash.
 *
 * Returns { success: true } and deletes the record on match (one-time use).
 * Returns { success: false, remainingAttempts, locked?, expired? } on failure.
 * Throws AppError for "not found" or "already locked" states.
 */
export const verifyOtp = async ({
  email,
  purpose,
  submittedCode,
}: VerifyOtpInput): Promise<OtpVerificationResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await Otp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });

  if (!record) {
    throw new AppError('Verification code not found or has already expired.', 400, ErrorCodes.NOT_FOUND);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await Otp.deleteOne({ _id: record._id });
    throw new AppError('Verification code has expired. Please request a new one.', 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (record.locked) {
    throw new AppError('Too many incorrect attempts. Please request a new code.', 429, ErrorCodes.RATE_LIMIT_EXCEEDED);
  }

  // Constant-time comparison to prevent timing attacks
  const storedBuf    = Buffer.from(record.otpHash, 'hex');
  const submittedBuf = Buffer.from(hashOtp(submittedCode.trim()), 'hex');
  const matches =
    storedBuf.length === submittedBuf.length &&
    crypto.timingSafeEqual(storedBuf, submittedBuf);

  if (!matches) {
    record.attempts += 1;
    if (record.attempts >= record.maxAttempts) record.locked = true;
    await record.save();
    return {
      success: false,
      remainingAttempts: Math.max(0, record.maxAttempts - record.attempts),
      locked: record.locked,
    };
  }

  // Match — delete the record so it can't be reused
  await Otp.deleteOne({ _id: record._id });
  return { success: true };
};