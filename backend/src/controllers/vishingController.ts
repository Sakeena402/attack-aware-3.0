import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import {
  generateTrackingToken,
  makeVoiceCall,
  voiceScripts,
} from '../services/twilioService.js';
import {
  recordCallInitiated,
  getCampaignSimulationStats,
} from '../services/trackingService.js';
import { Campaign } from '../models/Campaign.js';
import { User } from '../models/User.js';          // ✅ named import (was default in first half)

// Make single vishing call
export const sendVishingSimulation = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { campaignId, userId, scriptKey } = req.body;

    if (!campaignId || !userId || !scriptKey) {
      throw new AppError('Missing required fields: campaignId, userId, scriptKey', 400);
    }

    if (!voiceScripts[scriptKey as keyof typeof voiceScripts]) {
      throw new AppError('Invalid voice script', 400);
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.phoneNumber) {
      throw new AppError('User does not have a phone number', 400);
    }

    const trackingToken = generateTrackingToken();

    const result = await makeVoiceCall({
      to: user.phoneNumber,
      scriptKey: scriptKey as keyof typeof voiceScripts,
      trackingToken,
      campaignId,
      userId,
    });

    if (!result.success) {
      throw new AppError(result.error || 'Failed to make call', 500);
    }

    await recordCallInitiated({
      campaignId,
      userId,
      trackingToken,
      callSid: result.callSid!,
      phoneNumber: user.phoneNumber,
      scriptKey,
    });

    res.json({
      success: true,
      data: { callSid: result.callSid, status: 'initiated' },
      message: 'Vishing simulation call initiated',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to initiate vishing call' });
    }
  }
};

// Launch vishing campaign to all targets
export const sendCampaignVishing = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { campaignId } = req.params;
    const { scriptKey, targetDepartment, callInterval = 5000 } = req.body;

    if (!scriptKey) {
      throw new AppError('Script key is required', 400);
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    const query: Record<string, unknown> = {
      companyId: campaign.companyId,
      phoneNumber: { $exists: true, $ne: '' },
    };

    if (targetDepartment && targetDepartment !== 'all') {
      query.department = targetDepartment;
    } else if (campaign.targetDepartments && campaign.targetDepartments.length > 0) {
      query.department = { $in: campaign.targetDepartments };
    }

    const users = await User.find(query);

    if (users.length === 0) {
      throw new AppError('No users with phone numbers found for this campaign', 400);
    }

    const results = {
      total: users.length,
      initiated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      const trackingToken = generateTrackingToken();

      const result = await makeVoiceCall({
        to: user.phoneNumber!,
        scriptKey: scriptKey as keyof typeof voiceScripts,
        trackingToken,
        campaignId,
        userId: user._id.toString(),
      });

      if (result.success) {
        await recordCallInitiated({
          campaignId,
          userId: user._id.toString(),
          trackingToken,
          callSid: result.callSid!,
          phoneNumber: user.phoneNumber!,
          scriptKey,
        });
        results.initiated++;
      } else {
        results.failed++;
        results.errors.push(`${user.email}: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, callInterval));
    }

    campaign.status = 'active';
    campaign.voiceScript = scriptKey;
    await campaign.save();

    res.json({
      success: true,
      data: results,
      message: `Vishing campaign launched: ${results.initiated} calls initiated, ${results.failed} failed`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to launch vishing campaign' });
    }
  }
};

// Get available voice scripts
export const getVoiceScripts = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const scripts = Object.entries(voiceScripts).map(([key, script]) => ({
      key,
      name: script.name,
      description: getScriptDescription(key),
    }));

    res.json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch voice scripts' });
  }
};

const getScriptDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    bank_verification: 'Simulates a call from a financial institution about suspicious activity',
    it_support: 'Simulates a call from IT support about a security issue',
    insurance_claim: 'Simulates a call about an insurance policy update',
  };
  return descriptions[key] || 'Voice phishing simulation script';
};

// Get campaign vishing stats
export const getCampaignVishingStats = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { campaignId } = req.params;

    const stats = await getCampaignSimulationStats(campaignId);

    res.json({
      success: true,
      data: {
        ...stats,
        answerRate: stats.callsInitiated > 0
          ? Math.round((stats.callsAnswered / stats.callsInitiated) * 100)
          : 0,
        engagementRate: stats.callsAnswered > 0
          ? Math.round((stats.callsEngaged / stats.callsAnswered) * 100)
          : 0,
        reportRate: stats.callsAnswered > 0
          ? Math.round((stats.callsReported / stats.callsAnswered) * 100)
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaign stats' });
  }
};

export default {
  sendVishingSimulation,
  sendCampaignVishing,
  getVoiceScripts,
  getCampaignVishingStats,
};