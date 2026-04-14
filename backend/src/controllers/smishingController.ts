import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { AppError } from '../utils/errorHandler.js';
import {
  generateTrackingToken,
  sendSms,
  smsTemplates,
} from '../services/twilioService.js';
import {
  recordSmsSent,
  getCampaignSimulationStats,
} from '../services/trackingService.js';
import { Campaign } from '../models/Campaign.js';
import { User } from '../models/User.js';

// Send SMS simulation to single user
export const sendSmishingSimulation = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { campaignId, userId, templateKey } = req.body;

    if (!campaignId || !userId || !templateKey) {
      throw new AppError('Missing required fields: campaignId, userId, templateKey', 400);
    }

    // Validate template
    if (!smsTemplates[templateKey as keyof typeof smsTemplates]) {
      throw new AppError('Invalid SMS template', 400);
    }

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.phoneNumber) {
      throw new AppError('User does not have a phone number', 400);
    }

    // Generate tracking token
    const trackingToken = generateTrackingToken();

    // Send SMS
    const result = await sendSms({
      to: user.phoneNumber,
      templateKey: templateKey as keyof typeof smsTemplates,
      trackingToken,
      campaignId,
      userId,
    });

    if (!result.success) {
      throw new AppError(result.error || 'Failed to send SMS', 500);
    }

    // Record the sent SMS
    await recordSmsSent({
      campaignId,
      userId,
      trackingToken,
      messageSid: result.messageSid!,
      phoneNumber: user.phoneNumber,
      templateKey,
    });

    res.json({
      success: true,
      data: {
        messageSid: result.messageSid,
        status: 'sent',
      },
      message: 'SMS simulation sent successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send SMS simulation' });
    }
  }
};

// Send SMS to all campaign targets
export const sendCampaignSmishing = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { campaignId } = req.params;
    const { templateKey, targetDepartment } = req.body;

    if (!templateKey) {
      throw new AppError('Template key is required', 400);
    }

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    // Get target users
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
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send SMS to each user
    for (const user of users) {
      const trackingToken = generateTrackingToken();

      const result = await sendSms({
        to: user.phoneNumber!,
        templateKey: templateKey as keyof typeof smsTemplates,
        trackingToken,
        campaignId,
        userId: user._id.toString(),
      });

      if (result.success) {
        await recordSmsSent({
          campaignId,
          userId: user._id.toString(),
          trackingToken,
          messageSid: result.messageSid!,
          phoneNumber: user.phoneNumber!,
          templateKey,
        });
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${user.email}: ${result.error}`);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign status
    campaign.status = 'active';
    campaign.smsTemplate = templateKey;
    await campaign.save();

    res.json({
      success: true,
      data: results,
      message: `SMS campaign launched: ${results.sent} sent, ${results.failed} failed`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to launch SMS campaign' });
    }
  }
};

// Get available SMS templates
export const getSmsTemplates = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const templates = Object.entries(smsTemplates).map(([key, template]) => ({
      key,
      name: template.name,
      preview: template.message('[TRACKING_URL]'),
    }));

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
};

// Get campaign smishing stats
export const getCampaignSmishingStats = async (
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
        deliveryRate: stats.smsSent > 0 
          ? Math.round((stats.smsDelivered / stats.smsSent) * 100) 
          : 0,
        clickRate: stats.smsDelivered > 0 
          ? Math.round((stats.smsClicked / stats.smsDelivered) * 100) 
          : 0,
        compromiseRate: stats.smsClicked > 0 
          ? Math.round((stats.credentialsSubmitted / stats.smsClicked) * 100) 
          : 0,
        reportRate: stats.total > 0 
          ? Math.round((stats.reported / stats.total) * 100) 
          : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaign stats' });
  }
};

export default {
  sendSmishingSimulation,
  sendCampaignSmishing,
  getSmsTemplates,
  getCampaignSmishingStats,
};