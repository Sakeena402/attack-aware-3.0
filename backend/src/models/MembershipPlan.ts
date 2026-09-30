import { Schema, model, Document } from 'mongoose';

export type PlanCategory = 'individual' | 'enterprise';
export type PlanBilling = 'free' | 'monthly' | 'trial';

export interface IMembershipPlan extends Document {
  planId: string;              // stable slug matching frontend Plan.id, e.g. "ent-advanced"
  category: PlanCategory;
  name: string;
  seats: number;
  priceUSD: number;
  priceUSDPerUser?: number;
  priceRs: number;
  billing: PlanBilling;
  trialDays?: number;
  description: string;
  features: string[];
  maxEmployees: number;        // kept for employeeController.ts — always mirrors `seats`
  highlight: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    planId: { type: String, required: true, unique: true },
    category: { type: String, enum: ['individual', 'enterprise'], required: true },
    name: { type: String, required: true },
    seats: { type: Number, required: true },
    priceUSD: { type: Number, required: true },
    priceUSDPerUser: { type: Number },
    priceRs: { type: Number, required: true },
    billing: { type: String, enum: ['free', 'monthly', 'trial'], required: true },
    trialDays: { type: Number },
    description: { type: String, required: true },
    features: { type: [String], default: [] },
    maxEmployees: { type: Number, required: true },
    highlight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MembershipPlan = model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);