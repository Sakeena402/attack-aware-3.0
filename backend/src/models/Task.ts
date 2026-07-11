import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  companyId?: Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
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
  },
  { timestamps: true }
);

export const Task = model<ITask>('Task', taskSchema);
