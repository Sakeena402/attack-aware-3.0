import { Schema, model, Document, Types } from 'mongoose';

export interface IUserVideo extends Document {
  userId: Types.ObjectId;
  videoId: Types.ObjectId;
  status: 'Incomplete' | 'Completed';
  watchedAt?: Date;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userVideoSchema = new Schema<IUserVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    status: { type: String, enum: ['Incomplete', 'Completed'], default: 'Incomplete' },
    watchedAt: { type: Date },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

userVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const UserVideo = model<IUserVideo>('UserVideo', userVideoSchema);
