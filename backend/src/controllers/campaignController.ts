import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { Company }      from '../models/Company.js';
import { AppError }     from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
import { sendSms, generateTrackingToken as generateSmsToken, hashToken, smsTemplates } from '../services/twilioService.js';
import { recordSmsSent } from '../services/trackingService.js';
import { companyHasFeature } from '../services/planService.js';
import { sendPhishingEmail, generateTrackingToken as generateEmailToken, emailTemplates } from '../services/emailService.js';
import mongoose from 'mongoose';

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
      voiceScript,
    } = req.body;

    if (!campaignName || !type) {
      throw new AppError('Campaign name and type are required', 400);
    }

    const companyId = req.user.companyId;
    if (!companyId) throw new AppError('Company ID not found on user', 400);

    // ── Plan enforcement: campaign count cap ────────────────────────────────
    // super_admin is never capped. For other roles, if the plan lacks
    // 'Unlimited campaigns', enforce a hard cap of 10.
    // (Flag: placeholder cap of 10 — confirm final number with product team)
    if (req.user.role !== 'super_admin') {
      const hasUnlimited = await companyHasFeature(companyId, 'Unlimited campaigns');
      if (!hasUnlimited) {
        const CAMPAIGN_CAP = 10;
        const existingCount = await Campaign.countDocuments({ companyId });
        if (existingCount >= CAMPAIGN_CAP) {
          throw new AppError(
            `Campaign limit reached for your current plan (max ${CAMPAIGN_CAP}). Upgrade to a plan with 'Unlimited campaigns' to create more.`,
            403
          );
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

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
      emailTemplate: emailTemplate || '',
      smsTemplate: smsTemplate || '',
      voiceScript: voiceScript || '',
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
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
};

export const getCampaigns = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const companyFilter = (req as any).companyFilter || {};

    const campaigns = await Campaign.find(companyFilter)
      .populate('createdBy', 'name email')
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
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter })
      .populate('createdBy', 'name email');

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
    const companyFilter = (req as any).companyFilter || {};

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
      voiceScript,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (campaignName !== undefined)       update.campaignName = campaignName;
    if (type !== undefined)               update.type = type;
    if (description !== undefined)        update.description = description;
    if (status !== undefined)             update.status = status as CampaignStatus;
    if (startDate !== undefined)          update.startDate = new Date(startDate);
    if (endDate !== undefined)            update.endDate = new Date(endDate);
    if (targetEmployees !== undefined)    update.targetEmployees = targetEmployees;
    if (targetDepartments !== undefined)  update.targetDepartments = targetDepartments;
    if (emailTemplate !== undefined)      update.emailTemplate = emailTemplate;
    if (smsTemplate !== undefined)        update.smsTemplate = smsTemplate;
    if (voiceScript !== undefined)        update.voiceScript = voiceScript;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, ...companyFilter },
      update,
      { new: true, runValidators: true }
    );

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
};

export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

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
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);

    if (campaign.type === 'phishing') {
      console.log('🔍 PHISHING CAMPAIGN DETECTED', campaign._id);  // ← ADD THIS
      const targets = campaign.targetEmployees as TargetEmployee[];
      console.log('📧 TARGET EMAILS:', targets);  // ← ADD THIS
     

      if (!targets || targets.length === 0) {
        throw new AppError('No target employees found on this campaign. Add employees before launching.', 400);
      }

      campaign.status = 'active';
      campaign.startDate = new Date();
      await campaign.save();

      const results = { total: targets.length, sent: 0, failed: 0 };
      const templateKey = (campaign.emailTemplate || 'bank_phishing') as keyof typeof emailTemplates;

      for (const target of targets) {
        const email = target.email;
        const userId = target._id?.toString();

        if (!email || !userId) continue;

        const rawToken = generateEmailToken();
        const hashedToken = hashToken(rawToken);

        const emailResult = await sendPhishingEmail({
          to: email,
          templateKey,
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
          emailTemplate: templateKey,
          messageId: emailResult.messageId,
          emailAddress: email,
        });

        emailResult.success ? results.sent++ : results.failed++;
      }

      return res.status(200).json({
        success: true,
        data: { campaign, results },
        message: `Phishing campaign launched: ${results.sent} sent, ${results.failed} failed`,
      });
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

      for (const target of targets) {
        const phone = target.phone;
        const userId = target._id?.toString();

        if (!phone || !userId) continue;

        const rawToken = generateSmsToken();
        const hashedToken = hashToken(rawToken);

        const smsResult = await sendSms({
          to: phone,
          templateKey: (campaign.smsTemplate as keyof typeof smsTemplates) || 'bank_alert',
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
          smsTemplate: campaign.smsTemplate || 'bank_alert',
          messageSid: smsResult.messageSid,
          phoneNumber: phone,
        });

        smsResult.success ? results.sent++ : results.failed++;
      }

      return res.status(200).json({
        success: true,
        data: { campaign, results },
        message: `Smishing campaign launched: ${results.sent} sent, ${results.failed} failed`,
      });
    }

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign launched successfully' });
  } catch (error: any) {
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
    const companyFilter = (req as any).companyFilter || {};

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