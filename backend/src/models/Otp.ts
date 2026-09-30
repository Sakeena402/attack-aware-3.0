import mongoose, { Schema, Document, Types } from 'mongoose';

export type OtpPurpose = 'login_verification' | 'signup_verification';

export interface IOtp extends Document {
  userId?: Types.ObjectId;      // optional — not present for signup_verification before user is saved
  email: string;
  otpHash: string;              // NEVER plaintext — sha256 hex, same as twilioService.hashToken
  purpose: OtpPurpose;
  expiresAt: Date;              // 5 minutes from creation (TTL index deletes document automatically)
  attempts: number;             // starts at 0, incremented on each wrong code
  maxAttempts: number;          // always 5
  locked: boolean;              // true once attempts >= maxAttempts
  lastSentAt: Date;             // resend cooldown enforcement
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['login_verification', 'signup_verification'],
      required: true,
    },
    // TTL index: MongoDB auto-deletes the document once expiresAt is reached.
    // expireAfterSeconds: 0 means "delete as soon as the date passes".
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    locked: { type: Boolean, default: false },
    lastSentAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Fast lookup by email + purpose (the primary query pattern for both send and verify)
otpSchema.index({ email: 1, purpose: 1 });

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);

export default Otp;
