import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';

import { AppError }     from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
import { sendSms, generateTrackingToken as generateSmsToken, hashToken, smsTemplates } from '../services/twilioService.js';

import { companyHasFeature } from '../services/planService.js';
import { sendPhishingEmail, generateTrackingToken as generateEmailToken, emailTemplates } from '../services/emailService.js';


interface TargetEmployee {
  _id: string;
  phone?: string;
  email?: string;
}

export const createCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const {
      campaignName,
      type,
      description,
      endDate,
      startDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      aiGeneratedTemplateId,
      voiceScript,
    } = req.body;

    if (!campaignName || !type) {
      throw new AppError('Campaign name and type are required', 400);
    }

    const companyId = req.user.companyId;
    if (!companyId) throw new AppError('Company ID not found on user', 400);

    let finalEmail = emailTemplate || '';
    let finalSms = smsTemplate || '';
    let finalVoice = voiceScript || '';
    let finalAi = aiGeneratedTemplateId || undefined;

    if (finalAi) {
      finalEmail = '';
      finalSms = '';
      finalVoice = '';
    } else {
      if (type === 'phishing') { finalSms = ''; finalVoice = ''; }
      else if (type === 'smishing') { finalEmail = ''; finalVoice = ''; }
      else if (type === 'vishing') { finalEmail = ''; finalSms = ''; }
    }

    const hasStatic = Boolean(finalEmail || finalSms || finalVoice);
    const hasAI = Boolean(finalAi);
    if (!hasStatic && !hasAI) {
      throw new AppError('Campaign must have exactly one template source: either a static template key or aiGeneratedTemplateId', 400);
    }
    if (hasStatic && hasAI) {
      throw new AppError('Campaign cannot have both a static template key and an aiGeneratedTemplateId set', 400);
    }

    const newCampaign = new Campaign({
      campaignName,
      type,
      description,
      companyId,
      createdBy: req.user.id,
      status: 'draft',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      targetEmployees: targetEmployees || [],
      targetDepartments: targetDepartments || [],
      emailTemplate: finalEmail,
      smsTemplate: finalSms,
      aiGeneratedTemplateId: finalAi,
      voiceScript: finalVoice,
      clickRate: 0,
      reportRate: 0,
    });

    await newCampaign.save();

    res.status(201).json({ success: true, data: newCampaign });
  } catch (error) {
    console.error('CREATE CAMPAIGN ERROR:', error);
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: (error as Error).message || 'Failed to create campaign' });
  }
};

export const getCampaigns = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const campaigns = await Campaign.find(companyFilter)
      .populate('createdBy', 'name email')
      .populate('aiGeneratedTemplateId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
};

export const getCampaignById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter })
      .populate('createdBy', 'name email')
      .populate('aiGeneratedTemplateId');

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
};

export const updateCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const {
      campaignName,
      type,
      description,
      status,
      startDate,
      endDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      aiGeneratedTemplateId,
      voiceScript,
    } = req.body;

    const existingCampaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!existingCampaign) throw new AppError('Campaign not found', 404);

    let nextEmail = emailTemplate !== undefined ? emailTemplate : existingCampaign.emailTemplate;
    let nextSms = smsTemplate !== undefined ? smsTemplate : existingCampaign.smsTemplate;
    let nextVoice = voiceScript !== undefined ? voiceScript : existingCampaign.voiceScript;
    let nextAi = aiGeneratedTemplateId !== undefined ? aiGeneratedTemplateId : existingCampaign.aiGeneratedTemplateId;

    if (nextAi) {
      nextEmail = '';
      nextSms = '';
      nextVoice = '';
    } else {
      const currentType = type || existingCampaign.type;
      if (currentType === 'phishing') { nextSms = ''; nextVoice = ''; }
      else if (currentType === 'smishing') { nextEmail = ''; nextVoice = ''; }
      else if (currentType === 'vishing') { nextEmail = ''; nextSms = ''; }
    }

    const hasStatic = Boolean(nextEmail || nextSms || nextVoice);
    const hasAI = Boolean(nextAi);

    if (!hasStatic && !hasAI) {
      throw new AppError('Campaign must have exactly one template source: either a static template key or aiGeneratedTemplateId', 400);
    }
    if (hasStatic && hasAI) {
      throw new AppError('Campaign cannot have both a static template key and an aiGeneratedTemplateId set', 400);
    }

    const update: Record<string, unknown> = {
      emailTemplate: nextEmail,
      smsTemplate: nextSms,
      voiceScript: nextVoice,
      aiGeneratedTemplateId: nextAi || null,
    };
    if (campaignName !== undefined)          update.campaignName = campaignName;
    if (type !== undefined)                  update.type = type;
    if (description !== undefined)           update.description = description;
    if (status !== undefined)                update.status = status as CampaignStatus;
    if (startDate !== undefined)             update.startDate = new Date(startDate);
    if (endDate !== undefined)               update.endDate = new Date(endDate);
    if (targetEmployees !== undefined)       update.targetEmployees = targetEmployees;
    if (targetDepartments !== undefined)     update.targetDepartments = targetDepartments;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, ...companyFilter },
      update,
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: (error as Error).message || 'Failed to update campaign' });
  }
};

export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const campaign = await Campaign.findOneAndDelete({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: { message: 'Campaign deleted successfully' } });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
};

export const launchCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);

    let aiTemplateDoc: InstanceType<typeof import('../models/AIGeneratedTemplate.js').AIGeneratedTemplate> | null = null;
    if (campaign.aiGeneratedTemplateId) {
      const { AIGeneratedTemplate } = await import('../models/AIGeneratedTemplate.js');
      aiTemplateDoc = await AIGeneratedTemplate.findById(campaign.aiGeneratedTemplateId);
      if (!aiTemplateDoc) {
        throw new AppError('Referenced AI scenario template not found', 404);
      }
      if (aiTemplateDoc.status !== 'approved') {
        throw new AppError(
          `AI scenario template must be approved before launching campaign (current status: ${aiTemplateDoc.status})`,
          400
        );
      }
    }

    if (campaign.type === 'phishing') {
      const targets = campaign.targetEmployees as TargetEmployee[];

      if (!targets || targets.length === 0) {
        throw new AppError('No target employees found on this campaign. Add employees before launching.', 400);
      }

      campaign.status = 'active';
      campaign.startDate = new Date();
      await campaign.save();

      const results = { total: targets.length, sent: 0, failed: 0 };
      const templateKey = (campaign.emailTemplate || 'bank_phishing') as keyof typeof emailTemplates;
      const aiContent = aiTemplateDoc ? (aiTemplateDoc.editedContent || aiTemplateDoc.generatedContent) : undefined;

      for (const target of targets) {
        const email = target.email;
        const userId = target._id?.toString();

        if (!email || !userId) continue;

        const rawToken = generateEmailToken();
        const hashedToken = hashToken(rawToken);

        const emailResult = await sendPhishingEmail({
          to: email,
          templateKey: campaign.emailTemplate ? templateKey : undefined,
          customSubject: aiContent?.subject,
          customHtml: aiContent?.bodyHtml,
          trackingToken: rawToken,
          campaignId: campaign._id.toString(),
          userId,
        });

        await SimulationResult.create({
          userId,
          campaignId: campaign._id,
          simulationType: 'phishing',
          trackingToken: hashedToken,
          emailSent: emailResult.success,
          emailSentAt: new Date(),
          emailTemplate: campaign.emailTemplate || 'ai_generated',
          messageId: emailResult.messageId,
          emailAddress: email,
        });

        emailResult.success ? results.sent++ : results.failed++;
      }

      res.status(200).json({
        success: true,
        data: { campaign, results },
        message: `Phishing campaign launched: ${results.sent} sent, ${results.failed} failed`,
      });
      return;
    }

    if (campaign.type === 'smishing') {
      const targets = campaign.targetEmployees as TargetEmployee[];

      if (!targets || targets.length === 0) {
        throw new AppError('No target employees found on this campaign. Add employees before launching.', 400);
      }

      campaign.status = 'active';
      campaign.startDate = new Date();
      await campaign.save();

      const results = { total: targets.length, sent: 0, failed: 0 };
      const aiContent = aiTemplateDoc ? (aiTemplateDoc.editedContent || aiTemplateDoc.generatedContent) : undefined;

      for (const target of targets) {
        const phone = target.phone;
        const userId = target._id?.toString();

        if (!phone || !userId) continue;

        const rawToken = generateSmsToken();
        const hashedToken = hashToken(rawToken);

        const smsResult = await sendSms({
          to: phone,
          templateKey: (campaign.smsTemplate as keyof typeof smsTemplates) || 'bank_alert',
          customMessage: aiContent?.smsText,
          trackingToken: rawToken,
          campaignId: campaign._id.toString(),
          userId,
        });

        await SimulationResult.create({
          userId,
          campaignId: campaign._id,
          simulationType: 'smishing',
          trackingToken: hashedToken,
          smsSent: smsResult.success,
          smsSentAt: new Date(),
          smsTemplate: campaign.smsTemplate || 'ai_generated',
          messageSid: smsResult.messageSid,
          phoneNumber: phone,
        });

        smsResult.success ? results.sent++ : results.failed++;
      }

      res.status(200).json({
        success: true,
        data: { campaign, results },
        message: `Smishing campaign launched: ${results.sent} sent, ${results.failed} failed`,
      });
      return;
    }

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign launched successfully' });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      console.error('Launch Campaign Error:', error);
      res.status(500).json({ success: false, error: 'Failed to launch campaign' });
    }
  }
};

export const pauseCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as unknown as Record<string, unknown>).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status !== 'active') throw new AppError('Campaign is not active', 400);

    campaign.status = 'paused';
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign paused successfully' });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to pause campaign' });
  }
};