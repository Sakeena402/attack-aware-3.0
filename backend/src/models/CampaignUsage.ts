// backend/src/models/CampaignUsage.ts
// One row per (company, campaign, channel, month) — used to enforce monthly campaign quotas.

import { Schema, model, Document, Types } from 'mongoose';

export interface ICampaignUsage extends Document {
  companyId: Types.ObjectId;
  campaignId: Types.ObjectId;
  channel: 'phishing' | 'smishing' | 'vishing';
  period: string; // 'YYYY-MM' (UTC)
  createdAt: Date;
  updatedAt: Date;
}

const campaignUsageSchema = new Schema<ICampaignUsage>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    channel: { type: String, enum: ['phishing', 'smishing', 'vishing'], required: true },
    period: { type: String, required: true },
  },
  { timestamps: true }
);

// A campaign counts once per channel per month, however many times it is (re)launched
campaignUsageSchema.index({ companyId: 1, campaignId: 1, channel: 1, period: 1 }, { unique: true });
// Fast monthly count per company + channel
campaignUsageSchema.index({ companyId: 1, channel: 1, period: 1 });

export const CampaignUsage = model<ICampaignUsage>('CampaignUsage', campaignUsageSchema);