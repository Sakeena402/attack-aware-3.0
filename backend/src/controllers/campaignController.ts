
// backend/src/controllers/campaignController.ts  (OPTIMIZED LAUNCH)


import { Response }     from 'express';
import { Campaign }     from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { Company }      from '../models/Company.js';
import { AppError }     from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
import { sendSms, generateTrackingToken, smsTemplates } from '../services/twilioService.js';
import { recordSmsSent } from '../services/trackingService.js';
import { companyHasFeature } from '../services/planService.js';
import mongoose from 'mongoose';

// Dynamic import for p-limit (ESM compatible)
async function getLimit(concurrency: number) {
  const { default: pLimit } = await import('p-limit');
  return pLimit(concurrency);
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
export const createCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const {
      campaignName, type, description, endDate, startDate,
      targetEmployees, targetDepartments, emailTemplate, smsTemplate, voiceScript,
    } = req.body;

    if (!campaignName || !type) throw new AppError('Campaign name and type are required', 400);

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
      campaignName, type, description, companyId,
      createdBy:         req.user.id,
      status:            'draft',
      startDate:         startDate ? new Date(startDate) : new Date(),
      endDate:           endDate   ? new Date(endDate)   : null,
      targetEmployees:   targetEmployees   || [],
      targetDepartments: targetDepartments || [],
      emailTemplate:     emailTemplate || '',
      smsTemplate:       smsTemplate   || '',
      voiceScript:       voiceScript   || '',
      clickRate:         0,
      reportRate:        0,
      sentCount:         0,
      deliveredCount:    0,
      clickedCount:      0,
      reportedCount:     0,
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

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────
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
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getCampaignById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id }        = req.params;
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

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
export const updateCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id }        = req.params;
    const companyFilter = (req as any).companyFilter || {};
    const {
      campaignName, type, description, status, startDate, endDate,
      targetEmployees, targetDepartments, emailTemplate, smsTemplate, voiceScript,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (campaignName      !== undefined) update.campaignName      = campaignName;
    if (type              !== undefined) update.type              = type;
    if (description       !== undefined) update.description       = description;
    if (status            !== undefined) update.status            = status as CampaignStatus;
    if (startDate         !== undefined) update.startDate         = new Date(startDate);
    if (endDate           !== undefined) update.endDate           = new Date(endDate);
    if (targetEmployees   !== undefined) update.targetEmployees   = targetEmployees;
    if (targetDepartments !== undefined) update.targetDepartments = targetDepartments;
    if (emailTemplate     !== undefined) update.emailTemplate     = emailTemplate;
    if (smsTemplate       !== undefined) update.smsTemplate       = smsTemplate;
    if (voiceScript       !== undefined) update.voiceScript       = voiceScript;

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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id }        = req.params;
    const companyFilter = (req as any).companyFilter || {};
    const campaign = await Campaign.findOneAndDelete({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    await SimulationResult.deleteMany({ campaignId: new mongoose.Types.ObjectId(id) });
    res.json({ success: true, data: { message: 'Campaign deleted successfully' } });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH CAMPAIGN — PARALLEL WITH CONCURRENCY LIMIT
//
// Instead of sequential 100ms-delay loop, we process 10 users simultaneously.
// This is 5-10x faster while still being respectful of Twilio rate limits.
// ─────────────────────────────────────────────────────────────────────────────
export const launchCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id }        = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign)                    throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);

    // Non-smishing: simple activate
    if (campaign.type !== 'smishing') {
      campaign.status    = 'active';
      campaign.startDate = new Date();
      await campaign.save();
      return res.json({ success: true, data: campaign, message: 'Campaign launched successfully' });
    }

    const targets = campaign.targetEmployees as Array<{ _id: any; phone: string }>;
    if (!targets || targets.length === 0) {
      throw new AppError('No target employees found. Add employees before launching.', 400);
    }

    // Activate campaign and reset counters
    campaign.status        = 'active';
    campaign.startDate     = new Date();
    campaign.sentCount     = 0;
    campaign.deliveredCount = 0;
    campaign.clickedCount   = 0;
    campaign.reportedCount  = 0;
    await campaign.save();

    const results = { total: targets.length, sent: 0, failed: 0, errors: [] as string[] };

    
    const limit = await getLimit(10);

    const sendPromises = targets.map(target =>
      limit(async () => {
        const phone  = target.phone;
        const userId = target._id?.toString();

        if (!phone || !userId) {
          results.failed++;
          return;
        }

        const rawToken = generateTrackingToken();

        try {
          const smsResult = await sendSms({
            to:            phone,
            templateKey:   (campaign.smsTemplate as keyof typeof smsTemplates) || 'bank_alert',
            trackingToken: rawToken,
            campaignId:    campaign._id.toString(),
            userId,
          });

          if (smsResult.success) {
            await recordSmsSent({
              campaignId:    campaign._id.toString(),
              userId,
              trackingToken: rawToken,
              messageSid:    smsResult.messageSid!,
              phoneNumber:   phone,
              templateKey:   campaign.smsTemplate || 'bank_alert',
            });
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`userId=${userId}: ${smsResult.error}`);
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`userId=${userId}: ${err.message}`);
        }
      })
    );

    // Wait for all sends to complete
    await Promise.all(sendPromises);

    // Update sentCount after all sends
    await Campaign.findByIdAndUpdate(campaign._id, {
      $set: { sentCount: results.sent },
    });

    console.log(`[LAUNCH] Done: sent=${results.sent} failed=${results.failed}`);

    res.status(200).json({
      success: true,
      data:    { campaign, results },
      message: `Campaign launched: ${results.sent} sent, ${results.failed} failed`,
    });

  } catch (error: any) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else {
      console.error('Launch Campaign Error:', error);
      res.status(500).json({ success: false, error: 'Failed to launch campaign' });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PAUSE CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
export const pauseCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id }        = req.params;
    const companyFilter = (req as any).companyFilter || {};
    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign)                    throw new AppError('Campaign not found', 404);
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