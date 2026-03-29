import { Schema, model } from 'mongoose';
import { ISimulationResult } from '../types/index.js';

const simulationResultSchema = new Schema<ISimulationResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    emailOpened: {
      type: Boolean,
      default: false,
    },
    linkClicked: {
      type: Boolean,
      default: false,
    },
    credentialsSubmitted: {
      type: Boolean,
      default: false,
    },
    reportedPhishing: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

simulationResultSchema.index({ userId: 1 });
simulationResultSchema.index({ campaignId: 1 });
simulationResultSchema.index({ userId: 1, campaignId: 1 });

export const SimulationResult = model<ISimulationResult>(
  'SimulationResult',
  simulationResultSchema
);
