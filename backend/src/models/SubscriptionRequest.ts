import { Schema, model, Document, Types } from 'mongoose';

export type SubscriptionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ISubscriptionRequest extends Document {
  companyId?: Types.ObjectId;   // set for company (admin) requests
  userId?: Types.ObjectId;      // set for individual-user requests
  planId: Types.ObjectId;       // ref MembershipPlan
  requestedBy: Types.ObjectId;  // ref User (the admin, or the individual themselves)
  status: SubscriptionRequestStatus;
  reviewedBy?: Types.ObjectId;  // ref User (the super_admin)
  reviewedAt?: Date;
  rejectionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionRequestSchema = new Schema<ISubscriptionRequest>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    planId: { type: Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionNote: { type: String },
  },
  { timestamps: true }
);

// Exactly one owner: a company or an individual user
subscriptionRequestSchema.pre('validate', function (next) {
  if (!this.companyId === !this.userId) {
    return next(new Error('A subscription request must belong to either a company or an individual user'));
  }
  next();
});

subscriptionRequestSchema.index({ companyId: 1, status: 1 });
subscriptionRequestSchema.index({ userId: 1, status: 1 });

export const SubscriptionRequest = model<ISubscriptionRequest>(
  'SubscriptionRequest',
  subscriptionRequestSchema
);