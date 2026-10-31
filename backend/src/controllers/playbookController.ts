// backend/src/controllers/playbookController.ts
import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { Playbook } from '../models/Playbook.js';
import type { IPlaybook, PlaybookStatus } from '../models/Playbook.js';
import { AppError } from '../utils/errorHandler.js';

type AuthUser = NonNullable<AuthRequest['user']>;

const STATUS_VALUES: PlaybookStatus[] = ['draft', 'approved', 'rejected'];

// ─── Validation (edit body) ──────────────────────────────────────────────────

const stepSchema = z.object({
  description: z.string().trim().min(1).max(500),
  owner: z.string().trim().min(1).max(30),
});

const phaseSchema = z.object({
  title: z.string().trim().min(1).max(60),
  steps: z.array(stepSchema).min(1).max(15),
});

const resourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // http(s) only: blocks "javascript:" links
  link: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https?:\/\//i.test(v), { message: 'link must start with http:// or https://' }),
  type: z.enum(['video', 'article', 'document']),
});

const updatePlaybookSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    phases: z.array(phaseSchema).min(1).max(8).optional(),
    resources: z.array(resourceSchema).max(20).optional(),
    linkedCategories: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  })
  .strict();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendError(res: Response<ApiResponse>, error: unknown, fallback: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
}

async function loadPlaybook(id: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Playbook');
  const playbook = await Playbook.findById(id);
  if (!playbook) throw AppError.notFound('Playbook');
  return playbook;
}

/** Who may SEE this playbook. */
function canView(user: AuthUser, pb: IPlaybook): boolean {
  if (pb.scope === 'global') return true;
  if (user.role === 'super_admin') return true;
  if (!user.companyId || pb.companyId?.toString() !== user.companyId) return false;
  if (user.role === 'admin') return true; // admin sees draft / approved / rejected
  return pb.status === 'approved'; // employees: approved only
}

/** Who may EDIT / APPROVE / REJECT this (company) playbook. */
function canManage(user: AuthUser, pb: IPlaybook): boolean {
  if (pb.scope !== 'company') return false;
  if (user.role === 'super_admin') return true;
  return user.role === 'admin' && !!user.companyId && pb.companyId?.toString() === user.companyId;
}

/** Loads a company playbook the user is allowed to manage, or throws. */
async function loadManageable(user: AuthUser, id: string) {
  const playbook = await loadPlaybook(id);
  if (playbook.scope === 'global') {
    throw AppError.forbidden('Global playbooks cannot be changed here');
  }
  // 404 (not 403) so another company cannot learn that this ID exists
  if (!canManage(user, playbook)) throw AppError.notFound('Playbook');
  return playbook;
}

// ─── GET /api/playbooks ──────────────────────────────────────────────────────

export const listPlaybooksHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const user = req.user;

    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const isAdminLike = user.role === 'admin' || user.role === 'super_admin';
    const statusFilter =
      isAdminLike && statusRaw && STATUS_VALUES.includes(statusRaw as PlaybookStatus)
        ? (statusRaw as PlaybookStatus)
        : undefined;

    const clauses: Record<string, unknown>[] = [];

    // Global playbooks: visible to everyone (skipped when filtering by status)
    if (!statusFilter) clauses.push({ scope: 'global' });

    // Company playbooks
    if (user.role === 'super_admin') {
      const companyQuery = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
      const clause: Record<string, unknown> = { scope: 'company' };
      if (companyQuery && Types.ObjectId.isValid(companyQuery)) clause.companyId = companyQuery;
      if (statusFilter) clause.status = statusFilter;
      clauses.push(clause);
    } else if (user.companyId) {
      const clause: Record<string, unknown> = { scope: 'company', companyId: user.companyId };
      if (user.role === 'admin') {
        if (statusFilter) clause.status = statusFilter;
      } else {
        clause.status = 'approved'; // employees never see draft / rejected
      }
      clauses.push(clause);
    }
    // individual (no companyId): global only

    const filter: Record<string, unknown> = { $or: clauses };
    if (category) filter.category = category;

    const playbooks = await Playbook.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: playbooks });
  } catch (error) {
    sendError(res, error, 'Failed to fetch playbooks');
  }
};

// ─── GET /api/playbooks/:id ──────────────────────────────────────────────────

export const getPlaybookHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const playbook = await loadPlaybook(req.params.id);
    if (!canView(req.user, playbook)) throw AppError.notFound('Playbook');

    res.json({ success: true, data: playbook });
  } catch (error) {
    sendError(res, error, 'Failed to fetch playbook');
  }
};

// ─── PATCH /api/playbooks/:id ────────────────────────────────────────────────

export const updatePlaybookHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const playbook = await loadManageable(req.user, req.params.id);
    if (playbook.status !== 'draft') {
      throw new AppError('Only draft playbooks can be edited', 400);
    }

    const parsed = updatePlaybookSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      throw AppError.badRequest(message);
    }
    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      throw AppError.badRequest('No fields to update');
    }

    if (data.title !== undefined) playbook.title = data.title;
    if (data.category !== undefined) playbook.category = data.category;
    if (data.severity !== undefined) playbook.severity = data.severity;
    if (data.phases !== undefined) playbook.phases = data.phases;
    if (data.resources !== undefined) playbook.resources = data.resources;
    if (data.linkedCategories !== undefined) playbook.linkedCategories = data.linkedCategories;

    await playbook.save();
    res.json({ success: true, data: playbook });
  } catch (error) {
    sendError(res, error, 'Failed to update playbook');
  }
};

// ─── POST /api/playbooks/:id/approve ─────────────────────────────────────────

export const approvePlaybookHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const playbook = await loadManageable(req.user, req.params.id);
    if (playbook.status !== 'draft') {
      throw new AppError('Only draft playbooks can be approved', 400);
    }

    playbook.status = 'approved';
    playbook.reviewedBy = new Types.ObjectId(req.user.id);
    playbook.reviewedAt = new Date();
    await playbook.save();

    res.json({ success: true, data: playbook });
  } catch (error) {
    sendError(res, error, 'Failed to approve playbook');
  }
};

// ─── POST /api/playbooks/:id/reject ──────────────────────────────────────────

export const rejectPlaybookHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const playbook = await loadManageable(req.user, req.params.id);
    // An approved playbook can be withdrawn (e.g. a mistake is found later)
    if (playbook.status !== 'draft' && playbook.status !== 'approved') {
      throw new AppError('This playbook is already rejected', 400);
    }

    playbook.status = 'rejected';
    playbook.reviewedBy = new Types.ObjectId(req.user.id);
    playbook.reviewedAt = new Date();
    await playbook.save();

    res.json({ success: true, data: playbook });
  } catch (error) {
    sendError(res, error, 'Failed to reject playbook');
  }
};