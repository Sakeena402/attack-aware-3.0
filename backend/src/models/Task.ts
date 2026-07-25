import { Schema, model, Document, Types } from 'mongoose';

export type TaskContentType = 'video' | 'quiz' | 'game';

export interface ITask extends Document {
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  companyId?: Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;

  // ── New fields for content linking ──────────────────────────
  contentType: TaskContentType;      // 'video' | 'quiz' | 'game'
  contentId: Types.ObjectId;         // refers to Video/Quiz/Game _id
  points: number;                    // points awarded on completion
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    dueDate: { type: Date },

    contentType: { type: String, enum: ['video', 'quiz', 'game'], required: true },
    contentId: { type: Schema.Types.ObjectId, required: true },
    points: { type: Number, default: 10 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ contentType: 1, contentId: 1 });

export const Task = model<ITask>('Task', taskSchema);