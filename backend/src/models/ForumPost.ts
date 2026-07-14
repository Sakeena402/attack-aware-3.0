import { Schema, model, Document, Types } from 'mongoose';

export interface IForumPost extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  isUrdu: boolean;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const forumPostSchema = new Schema<IForumPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isUrdu: { type: Boolean, default: false },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

export const ForumPost = model<IForumPost>('ForumPost', forumPostSchema);
