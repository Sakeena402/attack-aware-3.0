import { Schema, model, Document, Types } from 'mongoose';

export interface IUserVideo extends Document {
  userId: Types.ObjectId;
  videoId: string; // static id, e.g. 'en-1', 'ur-3'
  status: 'Incomplete' | 'Completed';
  watchedAt?: Date;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userVideoSchema = new Schema<IUserVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: String, required: true },
    status: { type: String, enum: ['Incomplete', 'Completed'], default: 'Incomplete' },
    watchedAt: { type: Date },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

userVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });
export const UserVideo = model<IUserVideo>('UserVideo', userVideoSchema);