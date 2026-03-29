import { Schema, model } from 'mongoose';
import { ICampaign } from '../types/index.js';

const campaignSchema = new Schema<ICampaign>(
  {
    campaignName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['phishing', 'smishing', 'vishing'],
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'paused'],
      default: 'draft',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: false,
    },
    targetCount: {
      type: Number,
      default: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

campaignSchema.index({ companyId: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ status: 1 });

export const Campaign = model<ICampaign>('Campaign', campaignSchema);
