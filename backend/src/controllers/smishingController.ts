import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { sendSms, generateTrackingToken, hashToken, smsTemplates } from '../services/twilioService.js';
import {
  recordSmsStatus,
} from '../services/trackingService.js';

export const getSmsTemplates = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const templates = Object.entries(smsTemplates).map(([key, value]) => ({
      key,
      name: value.name,
      message: value.message('https://example.com/verify?token=SAMPLE'),
    }));

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch SMS templates' });
  }
};

export const sendSmishingSimulation = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const { recipientPhone, templateKey, campaignId } = req.body;

    if (!recipientPhone || !templateKey || !campaignId) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const token = generateTrackingToken();
    const hashedToken = hashToken(token);

    const smsResult = await sendSms({
      to: recipientPhone,
      templateKey: templateKey as keyof typeof smsTemplates,
      trackingToken: token,
      campaignId,
      userId: req.user.id,
    });

    if (!smsResult.success) {
      res.status(500).json({ success: false, error: smsResult.error });
      return;
    }

    await SimulationResult.create({
      userId: req.user.id,
      campaignId,
      simulationType: 'smishing',
      trackingToken: hashedToken,
      smsSent: true,
      smsSentAt: new Date(),
      smsTemplate: templateKey,
      messageSid: smsResult.messageSid,
      phoneNumber: recipientPhone,
    });

    campaign.sentCount = (campaign.sentCount || 0) + 1;
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { campaignId, recipientPhone, templateKey },
      message: 'Smishing SMS sent successfully',
    });
  } catch (error) {
    console.error('sendSmishingSimulation error:', error);
    res.status(500).json({ success: false, error: 'Failed to send smishing SMS' });
  }
};

export const sendCampaignSmishing = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const { campaignId } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: campaignId, ...companyFilter });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    if (campaign.type !== 'smishing') {
      res.status(400).json({ success: false, error: 'Campaign type is not smishing' });
      return;
    }

    const targetEmployees = campaign.targetEmployees as Array<{ _id: string; phone?: string }>;

    if (!targetEmployees || targetEmployees.length === 0) {
      res.status(400).json({ success: false, error: 'No target employees for this campaign' });
      return;
    }

    const results = { total: targetEmployees.length, sent: 0, failed: 0 };
    const templateKey = (campaign.smsTemplate || 'bank_alert') as keyof typeof smsTemplates;

    for (const target of targetEmployees) {
      const phone = target.phone;
      const userId = target._id?.toString();

      if (!phone || !userId) continue;

      const token = generateTrackingToken();
      const hashedToken = hashToken(token);

      const smsResult = await sendSms({
        to: phone,
        templateKey,
        trackingToken: token,
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
        smsTemplate: templateKey,
        messageSid: smsResult.messageSid,
        phoneNumber: phone,
      });

      smsResult.success ? results.sent++ : results.failed++;
    }

    res.status(200).json({
      success: true,
      data: { campaign, results },
      message: `Smishing campaign sent: ${results.sent} sent, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('sendCampaignSmishing error:', error);
    res.status(500).json({ success: false, error: 'Failed to send smishing campaign' });
  }
};

export const getCampaignSmishingStats = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: campaignId, ...companyFilter });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const results = await SimulationResult.find({
      campaignId,
      simulationType: 'smishing',
    }).populate('userId', 'name email phoneNumber');

    const stats = {
      campaignId,
      campaignName: campaign.campaignName,
      totalTargets: campaign.targetCount || results.length,
      smsSent: results.filter((r) => r.smsSent).length,
      smsDelivered: results.filter((r) => r.smsDelivered).length,
      smsClicked: results.filter((r) => r.smsClicked).length,
      deliveryRate: 0,
      clickRate: 0,
      details: results.map((r) => ({
        userId: r.userId,
        phoneNumber: r.phoneNumber,
        smsSent: r.smsSent,
        smsDelivered: r.smsDelivered,
        smsDeliveredAt: r.smsDeliveredAt,
        smsClicked: r.smsClicked,
        smsClickedAt: r.smsClickedAt,
      })),
    };

    const sent = stats.smsSent;
    if (sent > 0) {
      stats.deliveryRate = Math.round((stats.smsDelivered / sent) * 100);
      stats.clickRate = Math.round((stats.smsClicked / sent) * 100);
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getCampaignSmishingStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch smishing stats' });
  }
};

export default {
  getSmsTemplates,
  sendSmishingSimulation,
  sendCampaignSmishing,
  getCampaignSmishingStats,
};