import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { makeVoiceCall, generateTrackingToken, hashToken, voiceScripts } from '../services/twilioService.js';

export const getVoiceScripts = async (
  _req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const scripts = Object.entries(voiceScripts).map(([key, value]) => ({
      key,
      name: value.name,
    }));

    res.json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch voice scripts' });
  }
};

export const sendVishingSimulation = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const { recipientPhone, scriptKey, campaignId } = req.body;

    if (!recipientPhone || !scriptKey || !campaignId) {
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

    const callResult = await makeVoiceCall({
      to: recipientPhone,
      scriptKey: scriptKey as keyof typeof voiceScripts,
      trackingToken: token,
      campaignId,
      userId: req.user.id,
    });

    if (!callResult.success) {
      res.status(500).json({ success: false, error: callResult.error });
      return;
    }

    await SimulationResult.create({
      userId: req.user.id,
      campaignId,
      simulationType: 'vishing',
      trackingToken: hashedToken,
      callInitiated: true,
      callInitiatedAt: new Date(),
      voiceScript: scriptKey,
      callSid: callResult.callSid,
      phoneNumber: recipientPhone,
    });

    campaign.sentCount = (campaign.sentCount || 0) + 1;
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { campaignId, recipientPhone, scriptKey },
      message: 'Vishing call initiated successfully',
    });
  } catch (error) {
    console.error('sendVishingSimulation error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate vishing call' });
  }
};

export const sendCampaignVishing = async (
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

    if (campaign.type !== 'vishing') {
      res.status(400).json({ success: false, error: 'Campaign type is not vishing' });
      return;
    }

    const targetEmployees = campaign.targetEmployees as unknown as Array<{ _id: any; phone?: string }>;

    if (!targetEmployees || targetEmployees.length === 0) {
      res.status(400).json({ success: false, error: 'No target employees for this campaign' });
      return;
    }

    const results = { total: targetEmployees.length, sent: 0, failed: 0 };
    const scriptKey = (campaign.voiceScript || 'bank_verification') as keyof typeof voiceScripts;

    for (const target of targetEmployees) {
      const phone = target.phone;
      const userId = target._id?.toString();

      if (!phone || !userId) continue;

      const token = generateTrackingToken();
      const hashedToken = hashToken(token);

      const callResult = await makeVoiceCall({
        to: phone,
        scriptKey,
        trackingToken: token,
        campaignId: campaign._id.toString(),
        userId,
      });

      await SimulationResult.create({
        userId,
        campaignId: campaign._id,
        simulationType: 'vishing',
        trackingToken: hashedToken,
        callInitiated: callResult.success,
        callInitiatedAt: new Date(),
        voiceScript: scriptKey,
        callSid: callResult.callSid,
        phoneNumber: phone,
      });

      callResult.success ? results.sent++ : results.failed++;
    }

    res.status(200).json({
      success: true,
      data: { campaign, results },
      message: `Vishing campaign initiated: ${results.sent} sent, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('sendCampaignVishing error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate vishing campaign' });
  }
};

export const getCampaignVishingStats = async (
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
      simulationType: 'vishing',
    }).populate('userId', 'name email phoneNumber');

    const stats = {
      campaignId,
      campaignName: campaign.campaignName,
      totalTargets: campaign.targetCount || results.length,
      callsInitiated: results.filter((r) => r.callInitiated).length,
      callsAnswered: results.filter((r) => r.callAnswered).length,
      callsCompleted: results.filter((r) => r.callStatus === 'completed').length,
      keyPressRate: 0,
      conversionRate: 0,
      details: results.map((r) => ({
        userId: r.userId,
        phoneNumber: r.phoneNumber,
        callInitiated: r.callInitiated,
        callInitiatedAt: r.callInitiatedAt,
        callAnswered: r.callAnswered,
        callAnsweredAt: r.callAnsweredAt,
        callStatus: r.callStatus,
        voiceResponse: r.voiceResponse,
        callDuration: r.callDuration,
      })),
    };

    const initiated = stats.callsInitiated;
    if (initiated > 0) {
      stats.keyPressRate = Math.round((stats.callsAnswered / initiated) * 100);
      stats.conversionRate = Math.round((stats.callsCompleted / initiated) * 100);
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getCampaignVishingStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vishing stats' });
  }
};

export default {
  getVoiceScripts,
  sendVishingSimulation,
  sendCampaignVishing,
  getCampaignVishingStats,
};