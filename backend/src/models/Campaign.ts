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
    difficulty: {
      type:     String,
      enum:     ['easy', 'medium', 'hard', 'expert'],
      default:  'medium',
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

    // Target employees: array of { _id: ObjectId, phone: string, email: string }
    targetEmployees: {
      type: [
        {
          _id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
          phone: { type: String, default: '' },
          email: { type: String, default: '' },
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

    // AI Generated Template reference
    aiGeneratedTemplateId: {
      type: Schema.Types.ObjectId,
      ref:  'AIGeneratedTemplate',
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

// Schema-level mutual exclusivity validation
campaignSchema.pre('validate', function (next) {
  const hasStatic = Boolean(this.emailTemplate || this.smsTemplate || this.voiceScript);
  const hasAI = Boolean(this.aiGeneratedTemplateId);

  if (!hasStatic && !hasAI) {
    return next(
      new Error(
        'Campaign must have exactly one template source: either a static template key or aiGeneratedTemplateId.'
      )
    );
  }
  if (hasStatic && hasAI) {
    return next(
      new Error(
        'Campaign cannot have both a static template key and an aiGeneratedTemplateId set.'
      )
    );
  }
  next();
});

campaignSchema.index({ companyId: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ status:    1 });
campaignSchema.index({ companyId: 1, status: 1 });

export const Campaign = model<ICampaign>('Campaign', campaignSchema);