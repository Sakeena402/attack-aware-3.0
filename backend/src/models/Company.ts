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
  },
  { timestamps: true }
);

companySchema.index({ adminId: 1 });

export const Company = model<ICompany>('Company', companySchema);
