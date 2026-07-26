import mongoose, { Schema, model, Types } from 'mongoose';
import { IUser } from '../types/index.js';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'employee', 'individual'],
      default: 'employee',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    department: {
      type: String,
      default: 'General',
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    // singular badge — the current highest-earned badge, updated by updateUserPoints()
    badge: {
      type: String,
      default: 'Rookie',
    },
    badges: {
      type: [String],
      default: [],
    },
    achievements: {
      type: [String],
      default: [],
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'insufficient_data'],
      default: 'insufficient_data',
    },
    riskConfidence: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high'],
      default: 'low',
    },
    riskBreakdown: {
      type: Schema.Types.Mixed,
    },
    riskCalculatedAt: {
      type: Date,
    },
    trainingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    subscriptionPlan: {
      type: String,
    },
    subscriptionPackage: {
      type: String,
    },
    isUrduPreferred: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    bio: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.index({ companyId: 1 });
userSchema.index({ riskLevel: 1 });

// At the bottom of User.ts
export const User = mongoose.model<IUser>('User', userSchema);
// ^^^^^^ named export — this is what authController expects