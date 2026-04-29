
// backend/src/models/Campaign.ts

import { Schema, model } from 'mongoose';
import { ICampaign } from '../types/index.js';

const campaignSchema = new Schema<ICampaign>(
  {
    campaignName: {
      type:     String,
      required: true,
    },
    type: {
      type:     String,
      enum:     ['phishing', 'smishing', 'vishing'],
      required: true,
    },
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    companyId: {
      type:     Schema.Types.ObjectId,
      ref:      'Company',
      required: true,
    },
    description: {
      type:    String,
      default: '',
    },
    status: {
      type:    String,
      enum:    ['draft', 'active', 'completed', 'paused'],
      default: 'draft',
    },
    startDate: {
      type:    Date,
      default: Date.now,
    },
    endDate: {
      type:     Date,
      required: false,
    },
    targetCount: {
      type:    Number,
      default: 0,
    },
    completedCount: {
      type:    Number,
      default: 0,
    },
    targetDepartments: {
      type:    [String],
      default: [],
    },

    // Target employees: array of { _id: ObjectId, phone: string }
    // Phone is stored here so launchCampaign can send SMS without
    // an extra User lookup. Phone is also on the User document;
    // if they diverge, re-save the campaign to refresh.
    targetEmployees: {
      type: [
        {
          _id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
          phone: { type: String, default: '' },
        },
      ],
      default: [],
    },

    // SMS / Smishing
    smsTemplate: {
      type:    String,
      default: '',
    },
    customSmsMessage: {
      type:    String,
      default: '',
    },

    // Email template (phishing)
    emailTemplate: {
      type:    String,
      default: '',
    },

    // Voice / Vishing
    voiceScript: {
      type:    String,
      default: '',
    },

    // Scheduling
    scheduledTime: {
      type: Date,
    },

    // ── Live counters (incremented atomically via $inc) ───────────────────
    // These mirror what is in SimulationResult and give a fast dashboard
    // view without aggregating all simulation results on every page load.
    sentCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    deliveredCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    clickedCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    reportedCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // Derived rates (recalculated by analytics service)
    clickRate: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },
    reportRate: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },
  },
  { timestamps: true }
);

campaignSchema.index({ companyId: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ status:    1 });
campaignSchema.index({ companyId: 1, status: 1 });

export const Campaign = model<ICampaign>('Campaign', campaignSchema);