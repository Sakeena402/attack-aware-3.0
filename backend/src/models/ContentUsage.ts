// backend/src/models/ContentUsage.ts
// One row per user + item + month. Used to enforce the monthly video / game / quiz allowances.

import { Schema, model, Document, Types } from 'mongoose';

export type ContentType = 'video' | 'game' | 'quiz';

export interface IContentUsage extends Document {
  userId: Types.ObjectId;
  companyId?: Types.ObjectId;
  contentType: ContentType;
  /** video: static id like 'en-1'; game / quiz: ObjectId as string */
  contentId: string;
  language?: 'en' | 'ur';
  /** 'YYYY-MM' in UTC */
  period: string;
  createdAt: Date;
}

const contentUsageSchema = new Schema<IContentUsage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  contentType: { type: String, enum: ['video', 'game', 'quiz'], required: true },
  contentId: { type: String, required: true },
  language: { type: String, enum: ['en', 'ur'] },
  period: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// The same item in the same month is one row, so replays and rewatches are free
contentUsageSchema.index({ userId: 1, contentType: 1, contentId: 1, period: 1 }, { unique: true });
contentUsageSchema.index({ userId: 1, contentType: 1, period: 1, language: 1 });

export const ContentUsage = model<IContentUsage>('ContentUsage', contentUsageSchema);