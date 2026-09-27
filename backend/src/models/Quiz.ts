import { Schema, model, Document, Types } from 'mongoose';

export interface IQuizTriggerContext {
  employeeId?: Types.ObjectId;
  employeeIds?: Types.ObjectId[];
  attackType?: string;
  templateCategory?: string;
  failureEventId?: Types.ObjectId;
  eventType?: 'credentialsSubmitted' | 'linkClicked' | 'monthly_scheduled' | 'admin_manual' | 'campaign_launch';
  campaignId?: Types.ObjectId;
  campaignName?: string;
  topic?: string;
  month?: string;
  requestedBy?: Types.ObjectId;
  generatedAt: Date;
  topicSuggestionReason?: string;
  language?: 'en' | 'ur';
  errorMessage?: string;
  companyId?: Types.ObjectId;
}

export interface IQuiz extends Document {
  title: string;
  title_ur?: string;
  description?: string;
  description_ur?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  timeLimit?: number;
  thumbnail?: string;
  order: number;
  targetRoles: string[];
  source: 'static' | 'ai_generated';
  triggerContext?: IQuizTriggerContext;
  status?: 'queued' | 'generating' | 'pending_review' | 'published' | 'failed';
  companyId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const triggerContextSchema = new Schema<IQuizTriggerContext>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
    employeeIds: { type: [Schema.Types.ObjectId], ref: 'User' },
    attackType: { type: String },
    templateCategory: { type: String },
    failureEventId: { type: Schema.Types.ObjectId, ref: 'SimulationResult' },
    eventType: {
      type: String,
      enum: ['credentialsSubmitted', 'linkClicked', 'monthly_scheduled', 'admin_manual', 'campaign_launch'],
    },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    campaignName: { type: String },
    topic: { type: String },
    month: { type: String },
    topicSuggestionReason: { type: String },
    language: { type: String, enum: ['en', 'ur'] },
    errorMessage: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    title_ur: { type: String },
    description: { type: String },
    description_ur: { type: String },
    category: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    totalQuestions: { type: Number, default: 0 },
    timeLimit: { type: Number },
    thumbnail: { type: String },
    order: { type: Number, default: 0 },
    targetRoles: { type: [String], default: [] },
    source: { type: String, enum: ['static', 'ai_generated'], default: 'static' },
    triggerContext: { type: triggerContextSchema },
    status: { type: String, enum: ['queued', 'generating', 'pending_review', 'published', 'failed'], default: 'queued' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const Quiz = model<IQuiz>('Quiz', quizSchema);
