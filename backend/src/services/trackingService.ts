import SimulationResult from '../models/SimulationResult.js';
import { Campaign } from '../models/Campaign.js';
import { hashToken } from './twilioService.js';

export const recordSmsClick = async (
  token: string,
  campaignId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; alreadyClicked?: boolean }> => {
  try {
    const hashedToken = hashToken(token);

    const result = await SimulationResult.findOne({
      trackingToken: hashedToken,
      campaignId,
      userId,
    });

    if (!result) {
      return { success: false };
    }

    if (result.smsClicked) {
      return { success: true, alreadyClicked: true };
    }

    result.smsClicked = true;
    result.smsClickedAt = new Date();
    result.clickIpAddress = ipAddress;
    result.clickUserAgent = userAgent;

    await result.save();

    await Campaign.findByIdAndUpdate(
      campaignId,
      { $inc: { clickedCount: 1 } }
    );

    return { success: true };
  } catch (error) {
    console.error('recordSmsClick error:', error);
    return { success: false };
  }
};

export const recordSmsStatus = async (
  messageSid: string,
  status: string,
  errorCode?: string
): Promise<void> => {
  try {
    const result = await SimulationResult.findOne({ messageSid });

    if (!result) {
      console.warn(`SimulationResult not found for messageSid: ${messageSid}`);
      return;
    }

    result.smsStatus = status;
    if (status === 'delivered') {
      result.smsDelivered = true;
      result.smsDeliveredAt = new Date();
    } else if (status === 'failed' || status === 'undelivered') {
      result.smsFailed = true;
      result.smsFailedAt = new Date();
      result.smsErrorCode = errorCode;
    }

    await result.save();

    if (result.simulationType === 'smishing') {
      const campaign = await Campaign.findById(result.campaignId);
      if (campaign) {
        if (status === 'delivered') {
          campaign.deliveredCount = (campaign.deliveredCount || 0) + 1;
        } else if (status === 'failed') {
          campaign.reportedCount = (campaign.reportedCount || 0) + 1;
        }
        await campaign.save();
      }
    }
  } catch (error) {
    console.error('recordSmsStatus error:', error);
  }
};

export const recordCallStatus = async (
  callSid: string,
  status: string,
  duration?: number
): Promise<void> => {
  try {
    const result = await SimulationResult.findOne({ callSid });

    if (!result) {
      console.warn(`SimulationResult not found for callSid: ${callSid}`);
      return;
    }

    result.callStatus = status;
    result.callStatusUpdatedAt = new Date();

    if (status === 'completed' && duration) {
      result.callDuration = duration;
    }

    await result.save();
  } catch (error) {
    console.error('recordCallStatus error:', error);
  }
};

export const recordVoiceResponse = async (
  callSid: string,
  digits: string,
  campaignId: string,
  userId: string
): Promise<{ success: boolean }> => {
  try {
    const result = await SimulationResult.findOne({
      callSid,
      campaignId,
      userId,
    });

    if (!result) {
      console.warn(`SimulationResult not found for callSid: ${callSid}`);
      return { success: false };
    }

    result.voiceResponse = digits;
    result.voiceResponseAt = new Date();

    if (digits === '1' || digits === '2') {
      result.callAnswered = true;
      result.callAnsweredAt = new Date();

      await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { clickedCount: 1 } }
      );
    }

    await result.save();
    return { success: true };
  } catch (error) {
    console.error('recordVoiceResponse error:', error);
    return { success: false };
  }
};

export const recordEmailClick = async (
  token: string,
  campaignId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; alreadyClicked?: boolean }> => {
  try {
    const hashedToken = hashToken(token);

    const result = await SimulationResult.findOne({
      trackingToken: hashedToken,
      campaignId,
      userId,
    });

    if (!result) {
      return { success: false };
    }

    if (result.emailClicked) {
      return { success: true, alreadyClicked: true };
    }

    result.emailClicked = true;
    result.emailClickedAt = new Date();
    result.clickIpAddress = ipAddress;
    result.clickUserAgent = userAgent;

    await result.save();

    await Campaign.findByIdAndUpdate(
      campaignId,
      { $inc: { clickedCount: 1 } }
    );

    return { success: true };
  } catch (error) {
    console.error('recordEmailClick error:', error);
    return { success: false };
  }
};

export const recordEmailSent = async (
  campaignId: string,
  userId: string,
  email: string,
  messageId: string,
  trackingToken: string
): Promise<void> => {
  try {
    const hashedToken = hashToken(trackingToken);

    const result = new SimulationResult({
      userId,
      campaignId,
      simulationType: 'phishing',
      trackingToken: hashedToken,
      emailSent: true,
      emailSentAt: new Date(),
      emailAddress: email,
      messageId,
    });

    await result.save();

    await Campaign.findByIdAndUpdate(
      campaignId,
      { $inc: { sentCount: 1 } }
    );
  } catch (error) {
    console.error('recordEmailSent error:', error);
  }
};

export const recordEmailOpened = async (
  messageId: string
): Promise<void> => {
  try {
    const result = await SimulationResult.findOne({ messageId });

    if (!result) {
      return;
    }

    if (!result.emailOpened) {
      result.emailOpened = true;
      result.emailOpenedAt = new Date();

      await result.save();

      await Campaign.findByIdAndUpdate(
        result.campaignId,
        { $inc: { deliveredCount: 1 } }
      );
    }
  } catch (error) {
    console.error('recordEmailOpened error:', error);
  }
};

export const getCampaignPhishingStats = async (
  campaignId: string
): Promise<{
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  submittedCredentials: number;
}> => {
  try {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return { total: 0, sent: 0, opened: 0, clicked: 0, submittedCredentials: 0 };
    }

    const results = await SimulationResult.find({
      campaignId,
      simulationType: 'phishing',
    });

    const opened = results.filter((r) => r.emailOpened).length;
    const clicked = results.filter((r) => r.emailClicked).length;
    const submitted = results.filter((r) => r.credentialsSubmitted).length;

    return {
      total: campaign.targetCount || results.length,
      sent: campaign.sentCount || results.length,
      opened,
      clicked,
      submittedCredentials: submitted,
    };
  } catch (error) {
    console.error('getCampaignPhishingStats error:', error);
    return { total: 0, sent: 0, opened: 0, clicked: 0, submittedCredentials: 0 };
  }
};