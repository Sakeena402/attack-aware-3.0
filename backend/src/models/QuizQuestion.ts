import { Schema, model, Document, Types } from 'mongoose';

export interface IQuizQuestion extends Document {
  quizId?: Types.ObjectId;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  question_ur?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_a_ur?: string;
  option_b_ur?: string;
  option_c_ur?: string;
  option_d_ur?: string;
  correctOption: 'a' | 'b' | 'c' | 'd';
  answer: string;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    category: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    question: { type: String, required: true },
    question_ur: { type: String },
    option_a: { type: String, required: true },
    option_b: { type: String, required: true },
    option_c: { type: String, required: true },
    option_d: { type: String, required: true },
    option_a_ur: { type: String },
    option_b_ur: { type: String },
    option_c_ur: { type: String },
    option_d_ur: { type: String },
    correctOption: { type: String, enum: ['a', 'b', 'c', 'd'], required: true },
    answer: { type: String, required: true },
    explanation: { type: String },
  },
  { timestamps: true }
);

export const QuizQuestion = model<IQuizQuestion>('QuizQuestion', quizQuestionSchema);