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
      enum: ['super_admin', 'admin', 'employee'],
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
    badge: {
      type: String,
      default: 'Rookie',
    },
    badges: {
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
      enum: ['low', 'medium', 'high'],
      default: 'low',
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
  },
  { timestamps: true }
);

userSchema.index({ companyId: 1 });

// At the bottom of User.ts
export const User = mongoose.model<IUser>('User', userSchema);
// ^^^^^^ named export — this is what authController expects