// backend/src/models/UserRiskSummary.ts
//
// Phase 2 materialized summary scaffold — schema exists but write path
// is NOT wired up yet. When Phase 2 is implemented:
//   - On each new SimulationResult event: fast $inc update on this document.
//   - Nightly batch job: set lastFullRecalcAt and recompute decay-sensitive fields.
//   - computeUserRiskProfile() reads from here instead of re-aggregating all history.
//
// This schema is present now so Phase 2 is purely additive (no schema migration needed).

import { Schema, model, Document, Types } from 'mongoose';

export interface IUserRiskSummary extends Document {
  userId:              Types.ObjectId;
  // Weighted running sums — updated incrementally per event in Phase 2
  weightedClickScore:  number;
  weightedCredScore:   number;
  weightedReportScore: number;
  // Counts
  totalSimulations:    number;
  recentSimulations:   number;   // last 90 days — recomputed on batch run
  // Timestamps
  lastUpdated:         Date;
  lastFullRecalcAt:    Date | null;
  createdAt:           Date;
  updatedAt:           Date;
}

const userRiskSummarySchema = new Schema<IUserRiskSummary>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,   // one summary document per user
    },
    weightedClickScore:  { type: Number, default: 0 },
    weightedCredScore:   { type: Number, default: 0 },
    weightedReportScore: { type: Number, default: 0 },
    totalSimulations:    { type: Number, default: 0 },
    recentSimulations:   { type: Number, default: 0 },
    lastUpdated:         { type: Date,   default: Date.now },
    lastFullRecalcAt:    { type: Date,   default: null },
  },
  { timestamps: true },
);

userRiskSummarySchema.index({ userId: 1 }, { unique: true });

export const UserRiskSummary = model<IUserRiskSummary>('UserRiskSummary', userRiskSummarySchema);
