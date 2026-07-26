import { Schema, model, Document } from 'mongoose';

export interface IMembershipPlan extends Document {
  name: string;
  price: number;
  features: string[];
  maxEmployees: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    features: { type: [String], default: [] },
    maxEmployees: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MembershipPlan = model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);
