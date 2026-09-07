import { Schema, model, Document, Types } from 'mongoose';

export interface IQuizTriggerContext {
  employeeId: Types.ObjectId;
  attackType: string;
  templateCategory: string;
  failureEventId: Types.ObjectId;
  eventType?: 'credentialsSubmitted' | 'linkClicked';
  generatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const triggerContextSchema = new Schema<IQuizTriggerContext>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attackType: { type: String, required: true },
    templateCategory: { type: String, required: true },
    failureEventId: { type: Schema.Types.ObjectId, ref: 'SimulationResult', required: true },
    eventType: { type: String, enum: ['credentialsSubmitted', 'linkClicked'] },
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
  },
  { timestamps: true }
);

export const Quiz = model<IQuiz>('Quiz', quizSchema);
