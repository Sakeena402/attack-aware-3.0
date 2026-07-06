import { Schema, model, Document } from 'mongoose';

export interface IAttack extends Document {
  name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

const attackSchema = new Schema<IAttack>(
  {
    name: { type: String, required: true },
    description: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  },
  { timestamps: true }
);

export const Attack = model<IAttack>('Attack', attackSchema);
