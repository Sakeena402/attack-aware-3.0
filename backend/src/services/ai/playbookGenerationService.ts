// backend/src/services/ai/playbookGenerationService.ts
import { Types } from 'mongoose';
import { z } from 'zod';
import { Company } from '../../models/Company.js';
import { Playbook } from '../../models/Playbook.js';
import type { IPlaybook, PlaybookSeverity } from '../../models/Playbook.js';
import { aiService } from './aiService.js';
import { AppError } from '../../utils/errorHandler.js';

export interface GeneratePlaybookParams {
  companyId: string;
  category: string;
  severity: PlaybookSeverity;
  requestedBy: string;
}

const PHASE_TITLES = ['Identify', 'Contain', 'Eradicate', 'Recover', 'Lessons Learned'] as const;

// Categories that map to simulation types (used to link results to playbooks)
const SIMULATION_CATEGORIES = ['phishing', 'smishing', 'vishing'];

const playbookResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short playbook title, e.g. "Lost or Stolen Device"' },
    phases: {
      type: 'array',
      description:
        'Exactly 5 phases in this order: Identify, Contain, Eradicate, Recover, Lessons Learned',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Phase name' },
          steps: {
            type: 'array',
            description: '2 to 6 short action steps',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'One short action, imperative tone' },
                owner: { type: 'string', description: 'Exactly one of: Employee, Admin, IT' },
              },
              required: ['description', 'owner'],
            },
          },
        },
        required: ['title', 'steps'],
      },
    },
  },
  required: ['title', 'phases'],
};

const playbookZodSchema = z.object({
  title: z.string().trim().min(1).max(200),
  phases: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        steps: z
          .array(
            z.object({
              description: z.string().trim().min(1).max(300),
              owner: z.enum(['Employee', 'Admin', 'IT']),
            })
          )
          .min(2)
          .max(6),
      })
    )
    .length(5)
    .refine((phases) => phases.every((p, i) => p.title === PHASE_TITLES[i]), {
      message: 'Phases must be Identify, Contain, Eradicate, Recover, Lessons Learned in order',
    }),
});

type GeneratedPlaybook = z.infer<typeof playbookZodSchema>;

export const generatePlaybook = async (params: GeneratePlaybookParams): Promise<IPlaybook> => {
  const company = await Company.findById(params.companyId);
  if (!company) throw new AppError('Company not found', 404);

  const systemPrompt = `You are writing an incident response playbook for employees of a company. It is read by a person reacting in the middle of a real incident, not by a security specialist reading calmly.

Rules:
- Use plain, simple words. Each step is one short action sentence, action first (do this, then this).
- Use exactly 5 phases, in this order: Identify, Contain, Eradicate, Recover, Lessons Learned.
- Each step has an owner, exactly one of: Employee, Admin, IT. This is a display label only.
- Do not include links, URLs, phone numbers, or real company or product names.
- Return ONLY valid JSON matching the provided schema. No preamble, no markdown, no explanation.`;

  const userPrompt = `Write an incident response playbook for this incident category: ${params.category}
Severity: ${params.severity}

Each phase needs 2 to 6 steps. Steps for the person who first notices the incident should come first in each phase.

Respond with JSON matching this schema:
${JSON.stringify(playbookResponseSchema, null, 2)}`;

  const aiResult = await aiService.generateStructured<GeneratedPlaybook>(
    {
      systemPrompt,
      userPrompt,
      responseSchema: playbookResponseSchema,
      schema: playbookZodSchema,
      maxTokens: 2500,
    },
    { purpose: 'playbook_generation' }
  );

  const generated = aiResult.data;
  const normalizedCategory = params.category.trim().toLowerCase();

  return Playbook.create({
    title: generated.title,
    category: params.category.trim(),
    severity: params.severity,
    phases: generated.phases,
    resources: [],
    linkedCategories: SIMULATION_CATEGORIES.includes(normalizedCategory) ? [normalizedCategory] : [],
    scope: 'company',
    companyId: new Types.ObjectId(params.companyId),
    source: 'ai_generated',
    status: 'draft',
    createdBy: new Types.ObjectId(params.requestedBy),
  });
};