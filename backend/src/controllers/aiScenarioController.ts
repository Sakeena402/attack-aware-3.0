import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { generateScenario } from '../services/ai/scenarioGenerationService.js';
import { AIGeneratedTemplate } from '../models/AIGeneratedTemplate.js';
import { Campaign } from '../models/Campaign.js';
import { AppError } from '../utils/errorHandler.js';

export const generateScenarioHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const companyId = req.user.companyId;
    if (!companyId) throw new AppError('Company ID required', 400);

    const { attackType, targetEmployeeId, targetDepartment, difficulty, category } = req.body as {
      attackType: 'phishing' | 'smishing';
      targetEmployeeId?: string;
      targetDepartment?: string;
      difficulty?: string;
      category?: string;
    };

    if (!attackType || !['phishing', 'smishing'].includes(attackType)) {
      throw new AppError('Valid attackType (phishing or smishing) is required', 400);
    }

    const scenario = await generateScenario({
      companyId,
      attackType,
      targetEmployeeId,
      targetDepartment,
      difficulty: difficulty || 'medium',
      category,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: scenario });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      const msg = error instanceof Error ? error.message : 'Scenario generation failed';
      res.status(500).json({ success: false, error: msg });
    }
  }
};

export const getScenariosHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const companyId = (req.query.companyId as string) || req.user.companyId;
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {};
    if (req.user.role !== 'super_admin' || companyId) {
      filter.companyId = companyId || req.user.companyId;
    }
    if (status) {
      filter.status = status;
    }

    const scenarios = await AIGeneratedTemplate.find(filter)
      .populate('createdBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('targetEmployeeId', 'name department role email')
      .sort({ createdAt: -1 });

    const templateIds = scenarios.map((s) => s._id);
    const campaigns = await Campaign.find(
      { aiGeneratedTemplateId: { $in: templateIds } },
      { aiGeneratedTemplateId: 1, campaignName: 1, status: 1 }
    );

    const campaignMap = new Map<string, { _id: string; campaignName: string; status: string }>();
    campaigns.forEach((c) => {
      if (c.aiGeneratedTemplateId) {
        campaignMap.set(c.aiGeneratedTemplateId.toString(), {
          _id: (c._id as unknown as Types.ObjectId).toString(),
          campaignName: c.campaignName,
          status: c.status,
        });
      }
    });

    const scenariosWithCampaign = scenarios.map((s) => {
      const sObj = s.toObject();
      const campaign = campaignMap.get(s._id.toString());
      return {
        ...sObj,
        usedInCampaign: campaign || null,
      };
    });

    res.json({ success: true, data: scenariosWithCampaign });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch AI scenarios' });
  }
};

export const updateScenarioContentHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const { id } = req.params;
    const { editedContent } = req.body;

    if (!editedContent || typeof editedContent !== 'object') {
      throw new AppError('editedContent object is required', 400);
    }

    const scenario = await AIGeneratedTemplate.findById(id);
    if (!scenario) throw new AppError('Scenario not found', 404);

    if (req.user.role !== 'super_admin' && scenario.companyId.toString() !== req.user.companyId) {
      throw new AppError('Unauthorized access to scenario', 403);
    }

    if (scenario.status !== 'draft') {
      throw new AppError('Only draft scenarios can be edited', 400);
    }

    scenario.editedContent = editedContent;
    await scenario.save();

    res.json({ success: true, data: scenario });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update scenario' });
    }
  }
};

export const approveScenarioHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const { id } = req.params;

    const scenario = await AIGeneratedTemplate.findById(id);
    if (!scenario) throw new AppError('Scenario not found', 404);

    if (req.user.role !== 'super_admin' && scenario.companyId.toString() !== req.user.companyId) {
      throw new AppError('Unauthorized access to scenario', 403);
    }

    scenario.status = 'approved';
    scenario.reviewedBy = new Types.ObjectId(req.user.id);
    scenario.reviewedAt = new Date();
    await scenario.save();

    res.json({ success: true, data: scenario });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to approve scenario' });
    }
  }
};

export const rejectScenarioHandler = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);
    const { id } = req.params;

    const scenario = await AIGeneratedTemplate.findById(id);
    if (!scenario) throw new AppError('Scenario not found', 404);

    if (req.user.role !== 'super_admin' && scenario.companyId.toString() !== req.user.companyId) {
      throw new AppError('Unauthorized access to scenario', 403);
    }

    scenario.status = 'rejected';
    scenario.reviewedBy = new Types.ObjectId(req.user.id);
    scenario.reviewedAt = new Date();
    await scenario.save();

    res.json({ success: true, data: scenario });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reject scenario' });
    }
  }
};
