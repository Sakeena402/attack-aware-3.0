import { Schema, model, Document, Types } from 'mongoose';

export interface IUserQuiz extends Document {
  userId: Types.ObjectId;
  quizId: Types.ObjectId;
  score: number;
  totalQuestions: number;
  completedAt: Date;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userQuizSchema = new Schema<IUserQuiz>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true, default: 0 },
    totalQuestions: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

export const UserQuiz = model<IUserQuiz>('UserQuiz', userQuizSchema);
