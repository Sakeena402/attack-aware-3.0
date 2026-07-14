import { Schema, model, Document } from 'mongoose';

export interface IVideo extends Document {
  title: string;
  description?: string;
  filePath: string;
  category: string;
  language: 'en' | 'ur';
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true },
    description: { type: String },
    filePath: { type: String, required: true },
    category: { type: String, required: true },
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    targetRoles: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Video = model<IVideo>('Video', videoSchema);
