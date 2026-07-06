import { Schema, model, Document, Types } from 'mongoose';

export interface IForumComment extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  commentText: string;
  isUrdu: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    commentText: { type: String, required: true },
    isUrdu: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ForumComment = model<IForumComment>('ForumComment', forumCommentSchema);
