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
    targetDepartments: {
      type: [String],    
      default: [],
    },
    //addition by hifza (addition starrted here)
    // Add this in your Schema definition
targetEmployees: {
  type: [
    {
      _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      phone: { type: String, required: false, default: '' },  // ✅ optional
    }
  ],
  default: [],
},
   // addition by hifza (addition ended here)
    // SMS/Smishing specific fields
    smsTemplate: {
      type: String,
      default: '',
    },
    customSmsMessage: {
      type: String,
      default: '',
    },
    // Voice/Vishing specific fields
    voiceScript: {
      type: String,
      default: '',
    },
    // Scheduling
    scheduledTime: {
      type: Date,
    },
    // Stats tracking
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    clickedCount: {
      type: Number,
      default: 0,
    },
    reportedCount: {
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
