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

  let employeeInfo = '';
  if (params.targetEmployeeId) {
    const employee = await User.findById(params.targetEmployeeId);
    if (employee) {
      employeeInfo = `Target Employee: ${employee.name}, Department: ${employee.department}, Role: ${employee.role}`;
      console.log(`[ScenarioGen] 👤 Targeting employee: ${employee.name} (${employee.department})`);
    }
  }

  const departmentInfo = params.targetDepartment ? `Target Department: ${params.targetDepartment}` : '';

  const systemPrompt = `You are an AI assistant generating realistic, department-aware social engineering training content for an AUTHORIZED internal security awareness exercise at ${company.companyName}.
Generate a scenario for an attack type of '${params.attackType}' with difficulty '${params.difficulty}'.
Context: ${departmentInfo} ${employeeInfo}.
For phishing (email), provide subject, senderPersona, bodyHtml (with a clear link placeholder like {{phishingUrl}}), and category.
For smishing (SMS), provide senderPersona, smsText (concise text with {{phishingUrl}} placeholder), and category.
Maintain professional safety framing and output strictly formatted JSON matching the required schema.`;

  const userPrompt = `Generate a realistic ${params.difficulty} level ${params.attackType} security awareness simulation template.`;

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
