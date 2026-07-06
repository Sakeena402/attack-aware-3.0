import { Schema, model } from 'mongoose';
import { ICompany } from '../types/index.js';

const companySchema = new Schema<ICompany>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    enterpriseCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    contactPerson: {
      type: String,
    },
    taxId: {
      type: String,
    },
    subscriptionPlan: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPlan',
    },
  },
  { timestamps: true }
);

companySchema.index({ adminId: 1 });

export const Company = model<ICompany>('Company', companySchema);
