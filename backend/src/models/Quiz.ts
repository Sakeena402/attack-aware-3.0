import { Schema, model, Document } from 'mongoose';

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
  order: number;          // ← NEW — position in the original 2.0 unlock sequence
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
    order: { type: Number, required: true },
    targetRoles: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Quiz = model<IQuiz>('Quiz', quizSchema);
