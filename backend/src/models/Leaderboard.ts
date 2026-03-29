import { Schema, model } from 'mongoose';
import { ILeaderboard } from '../types/index.js';

const leaderboardSchema = new Schema<ILeaderboard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

leaderboardSchema.index({ companyId: 1, score: -1 });
leaderboardSchema.index({ department: 1, score: -1 });

export const Leaderboard = model<ILeaderboard>('Leaderboard', leaderboardSchema);
