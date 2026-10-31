// backend/src/models/Playbook.ts
import { Schema, model, Document, Types } from 'mongoose';

export type PlaybookSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PlaybookScope = 'global' | 'company';
export type PlaybookSource = 'seeded' | 'ai_generated';
export type PlaybookStatus = 'draft' | 'approved' | 'rejected';
export type PlaybookResourceType = 'video' | 'article' | 'document';

export interface IPlaybookStep {
  description: string;
  // Display label only ("Employee" | "Admin" | "IT"). NOT an RBAC role.
  owner: string;
}

export interface IPlaybookPhase {
  // "Identify" | "Contain" | "Eradicate" | "Recover" | "Lessons Learned"
  title: string;
  steps: IPlaybookStep[];
}

export interface IPlaybookResource {
  title: string;
  link: string;
  type: PlaybookResourceType;
}

export interface IPlaybook extends Document {
  title: string;
  category: string;
  severity: PlaybookSeverity;
  phases: IPlaybookPhase[];
  resources: IPlaybookResource[];
  // Matches existing simulation/attack category values
  linkedCategories: string[];
  scope: PlaybookScope;
  companyId?: Types.ObjectId;
  source: PlaybookSource;
  // Only meaningful when source === 'ai_generated'
  status?: PlaybookStatus;
  createdBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stepSchema = new Schema<IPlaybookStep>(
  {
    description: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const phaseSchema = new Schema<IPlaybookPhase>(
  {
    title: { type: String, required: true, trim: true },
    steps: { type: [stepSchema], default: [] },
  },
  { _id: false }
);

const resourceSchema = new Schema<IPlaybookResource>(
  {
    title: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    type: { type: String, enum: ['video', 'article', 'document'], required: true },
  },
  { _id: false }
);

const playbookSchema = new Schema<IPlaybook>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    phases: { type: [phaseSchema], default: [] },
    resources: { type: [resourceSchema], default: [] },
    linkedCategories: { type: [String], default: [] },
    scope: { type: String, enum: ['global', 'company'], required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    source: { type: String, enum: ['seeded', 'ai_generated'], required: true },
    status: { type: String, enum: ['draft', 'approved', 'rejected'] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// scope 'company' needs companyId, scope 'global' must not have companyId
playbookSchema.pre('validate', function (next) {
  if (this.scope === 'company' && !this.companyId) {
    return next(new Error('companyId is required when scope is "company"'));
  }
  if (this.scope === 'global' && this.companyId) {
    return next(new Error('companyId must not be set when scope is "global"'));
  }
  next();
});

playbookSchema.index({ scope: 1, companyId: 1, status: 1 });
playbookSchema.index({ title: 1, scope: 1 });
playbookSchema.index({ linkedCategories: 1 });

export const Playbook = model<IPlaybook>('Playbook', playbookSchema);