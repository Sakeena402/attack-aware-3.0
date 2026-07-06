import { Schema, model, Document } from 'mongoose';

export interface IGame extends Document {
  name: string;
  description?: string;
  category: string;
  maxScore: number;
  gameUrl: string;
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    maxScore: { type: Number, required: true },
    gameUrl: { type: String, required: true },
    targetRoles: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Game = model<IGame>('Game', gameSchema);
