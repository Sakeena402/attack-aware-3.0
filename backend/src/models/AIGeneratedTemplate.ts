import { Schema, model, Document, Types } from 'mongoose';

export interface IAIGeneratedTemplateContent {
  subject?: string;
  senderPersona: string;
  bodyHtml?: string;
  smsText?: string;
  category: string;
}

export interface IAIGeneratedTemplate extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  attackType: 'phishing' | 'smishing';
  targetEmployeeId?: Types.ObjectId;
  targetDepartment?: string;
  difficulty: string;
  status: 'draft' | 'approved' | 'rejected';
  generatedContent: IAIGeneratedTemplateContent;
  editedContent?: IAIGeneratedTemplateContent;
  createdBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  aiGenerationLogId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const templateContentSchema = new Schema<IAIGeneratedTemplateContent>(
  {
    subject: { type: String },
    senderPersona: { type: String, required: true },
    bodyHtml: { type: String },
    smsText: { type: String },
    category: { type: String, required: true },
  },
  { _id: false }
);

const aiGeneratedTemplateSchema = new Schema<IAIGeneratedTemplate>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    attackType: { type: String, enum: ['phishing', 'smishing'], required: true },
    targetEmployeeId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetDepartment: { type: String },
    difficulty: { type: String, required: true },
    status: { type: String, enum: ['draft', 'approved', 'rejected'], default: 'draft' },
    generatedContent: { type: templateContentSchema, required: true },
    editedContent: { type: templateContentSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    aiGenerationLogId: { type: Schema.Types.ObjectId, ref: 'AIGenerationLog' },
  },
  { timestamps: true }
);

aiGeneratedTemplateSchema.index({ companyId: 1, status: 1 });

export const AIGeneratedTemplate = model<IAIGeneratedTemplate>(
  'AIGeneratedTemplate',
  aiGeneratedTemplateSchema
);
