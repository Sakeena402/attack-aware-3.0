import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { Company } from '../../models/Company.js';
import { AIGeneratedTemplate, IAIGeneratedTemplate, IAIGeneratedTemplateContent } from '../../models/AIGeneratedTemplate.js';
import { aiService } from './aiService.js';
import { AppError } from '../../utils/errorHandler.js';

export interface GenerateScenarioParams {
  companyId: string | Types.ObjectId;
  attackType: 'phishing' | 'smishing';
  targetEmployeeId?: string | Types.ObjectId;
  targetDepartment?: string;
  difficulty: string;
  category?: string;
  createdBy: string | Types.ObjectId;
}

const scenarioResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: 'Subject line (required for phishing)' },
    senderPersona: { type: 'string', description: 'Display name/role of simulated sender' },
    bodyHtml: { type: 'string', description: 'HTML body content (required for phishing)' },
    smsText: { type: 'string', description: 'SMS message text (required for smishing)' },
    category: { type: 'string', description: 'Scenario topic category' },
  },
  required: ['senderPersona', 'category'],
};

const scenarioZodSchema = z.object({
  subject: z.string().optional(),
  senderPersona: z.string().min(1),
  bodyHtml: z.string().optional(),
  smsText: z.string().optional(),
  category: z.string().min(1),
});

export const generateScenario = async (
  params: GenerateScenarioParams
): Promise<IAIGeneratedTemplate> => {
  console.log(
    `[ScenarioGen] 🎣 Starting scenario generation | attackType="${params.attackType}" | difficulty="${params.difficulty}" | companyId="${params.companyId}"`
  );

  const company = await Company.findById(params.companyId);
  if (!company) {
    throw new AppError('Company not found', 404);
  }

  let jobTitle = 'Staff Member';
  let department = params.targetDepartment || 'General Department';

  if (params.targetEmployeeId) {
    const employee = await User.findById(params.targetEmployeeId);
    if (employee) {
      if (employee.role) jobTitle = employee.role;
      if (employee.department) department = employee.department;
      console.log(`[ScenarioGen] 👤 Targeting employee: ${employee.name} (${department} - ${jobTitle})`);
    }
  }

  const categoryText = params.category || 'auto-selected contextually (e.g. credential harvesting, invoice/payment fraud, IT support impersonation, HR/benefits pretext, package delivery pretext)';

  const systemPrompt = `You are generating simulated phishing/smishing content for an authorized internal cybersecurity awareness training exercise. This content is shown only to employees enrolled in their company's security training program and is never used for actual fraud or sent outside this controlled exercise.

Generate content that is realistic enough to meaningfully test an employee's awareness, calibrated to the specified difficulty level. Do not include real third-party company names, real phone numbers, or anything that could be mistaken for genuine external communication — use plausible but clearly fictional or generic branding (e.g. "your IT department", "your benefits provider") rather than naming real companies.

Return ONLY valid JSON matching the provided schema. No preamble, no markdown formatting, no explanation — the response must be parseable JSON and nothing else.`;

  const schemaString = JSON.stringify(scenarioResponseSchema, null, 2);

  const userPrompt = `Generate a ${params.attackType} scenario with the following parameters:

- Target role: ${jobTitle} in ${department}
- Difficulty: ${params.difficulty}
  - easy: obvious red flags (generic greeting, urgent threatening tone, suspicious sender address pattern)
  - medium: some red flags present but content is contextually plausible
  - hard: minimal red flags, highly contextual to the role, mimics legitimate internal communication patterns
- Attack category: ${categoryText}
  (e.g. credential harvesting, invoice/payment fraud, IT support impersonation, HR/benefits pretext, package delivery pretext)

The scenario must feel specific to someone in this role — reference plausible tools, processes, or concerns relevant to ${department}, not generic language that could apply to any employee.

For phishing (email): include subject line, sender display name persona, and HTML body. Use the placeholder {{trackingUrl}} wherever a link should appear — do not generate a real URL.

For smishing (SMS): keep the message under 160 characters, include the {{trackingUrl}} placeholder, and match the terse, urgent tone typical of real SMS phishing.

Respond with JSON matching this schema:
${schemaString}`;

  console.log(`[ScenarioGen] 🤖 Calling AI service for scenario...`);
  const aiResult = await aiService.generateStructured<IAIGeneratedTemplateContent>(
    {
      systemPrompt,
      userPrompt,
      responseSchema: scenarioResponseSchema,
      schema: scenarioZodSchema,
      maxTokens: 1200,
    },
    {
      purpose: 'scenario_generation',
    }
  );

  const generatedContent = aiResult.data;
  console.log(
    `[ScenarioGen] ✅ AI scenario received | category="${generatedContent.category}" | senderPersona="${generatedContent.senderPersona}"`
  );

  const template = await AIGeneratedTemplate.create({
    companyId: params.companyId,
    attackType: params.attackType,
    targetEmployeeId: params.targetEmployeeId,
    targetDepartment: params.targetDepartment,
    difficulty: params.difficulty,
    status: 'draft',
    generatedContent,
    createdBy: params.createdBy,
  });

  console.log(`[ScenarioGen] 💾 Template saved to DB | templateId="${template._id}" | attackType="${params.attackType}"`);

  return template;
};
