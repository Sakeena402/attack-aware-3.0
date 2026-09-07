import { Schema, model, Types } from 'mongoose';

export type AIGenerationPurpose = 'scenario_generation' | 'adaptive_quiz_generation';

export interface IAIGenerationLog {
  _id?: Types.ObjectId;
  provider: string;
  model: string;
  purpose: AIGenerationPurpose;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  relatedEntityId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const aiGenerationLogSchema = new Schema<IAIGenerationLog>(
  {
    provider: { type: String, required: true },
    model: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['scenario_generation', 'adaptive_quiz_generation'],
      required: true,
    },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, required: true },
    errorMessage: { type: String },
    relatedEntityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

aiGenerationLogSchema.index({ createdAt: -1 });

export const AIGenerationLog = model<IAIGenerationLog>(
  'AIGenerationLog',
  aiGenerationLogSchema
);
