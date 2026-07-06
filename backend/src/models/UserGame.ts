import { Schema, model, Document, Types } from 'mongoose';

export interface IUserGame extends Document {
  userId: Types.ObjectId;
  gameId: Types.ObjectId;
  score: number;
  playedAt: Date;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userGameSchema = new Schema<IUserGame>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    score: { type: Number, required: true, default: 0 },
    playedAt: { type: Date, default: Date.now },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  },
  { timestamps: true }
);

export const UserGame = model<IUserGame>('UserGame', userGameSchema);
