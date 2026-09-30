// backend/src/models/PointsAward.ts
// Ledger of points already given: one row per user + award type + item + month.
// The unique index is what makes "points once per item per month" safe under parallel requests.

import { Schema, model, Document, Types } from 'mongoose';

export type PointsAwardType = 'video' | 'game' | 'game_high_score' | 'quiz';

export interface IPointsAward extends Document {
  userId: Types.ObjectId;
  awardType: PointsAwardType;
  /** video: static id like 'en-1'; game / quiz: ObjectId as string */
  contentId: string;
  /** 'YYYY-MM' in UTC */
  period: string;
  createdAt: Date;
}

const pointsAwardSchema = new Schema<IPointsAward>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  awardType: { type: String, enum: ['video', 'game', 'game_high_score', 'quiz'], required: true },
  contentId: { type: String, required: true },
  period: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

pointsAwardSchema.index({ userId: 1, awardType: 1, contentId: 1, period: 1 }, { unique: true });

export const PointsAward = model<IPointsAward>('PointsAward', pointsAwardSchema);