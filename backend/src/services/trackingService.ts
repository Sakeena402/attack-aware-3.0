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

// Called from webhookController.ts's handleSmsStatus with a single options
// object matching the Twilio webhook field names. Kept as an object param
// (rather than positional args) so the call site stays readable and so
// adding new Twilio fields later doesn't require reordering arguments.
export const recordSmsStatus = async (
  params: {
    messageSid: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> => {
  const { messageSid, status, errorCode } = params;

  try {
    const result = await SimulationResult.findOne({ messageSid });

    if (!result) {
      console.warn(`SimulationResult not found for messageSid: ${messageSid}`);
      return;
    }

    result.smsDeliveryStatus = status;
    if (status === 'delivered') {
      result.smsDelivered = true;
      result.smsDeliveredAt = new Date();
    } else if (status === 'failed' || status === 'undelivered') {
      result.smsDeliveryError = errorCode;
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

// Called from webhookController.ts's handleCallStatus with a single options
// object matching Twilio's call-status webhook field names.
export const recordCallStatus = async (
  params: {
    callSid: string;
    status: string;
    duration?: number;
    answeredBy?: string;
  }
): Promise<void> => {
  const { callSid, status, duration, answeredBy } = params;

  try {
    const result = await SimulationResult.findOne({ callSid });

    if (!result) {
      console.warn(`SimulationResult not found for callSid: ${callSid}`);
      return;
    }

    result.callStatus = status;
    result.callStatusUpdatedAt = new Date();

    if (answeredBy) {
      result.answeredBy = answeredBy;
    }

    // Twilio reports "in-progress" once a human/machine picks up — that's
    // the actual "answered" moment (there is no literal "answered" CallStatus).
    if (status === 'in-progress' && !result.callAnswered) {
      result.callAnswered = true;
      result.callAnsweredAt = new Date();
    }

    if (status === 'completed') {
      result.callCompleted = true;
      result.callCompletedAt = new Date();
      if (duration) {
        result.callDuration = duration;
      }
    }

    await result.save();
  } catch (error) {
    console.error('recordCallStatus error:', error);
  }
};

// Called from webhookController.ts's handleVoiceResponse with a single
// options object. digitsPressed is the DTMF key the employee pressed.
export const recordVoiceResponse = async (
  params: {
    callSid: string;
    digitsPressed: string;
    campaignId: string;
    userId: string;
  }
): Promise<{ success: boolean }> => {
  const { callSid, digitsPressed, campaignId, userId } = params;

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

    result.callResponse = digitsPressed;
    result.callResponseAt = new Date();

    if (digitsPressed === '1' || digitsPressed === '2') {
      // They engaged with the fake "verify"/"speak to rep" prompt — fell for it.
      result.voiceEngaged = true;

      await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { clickedCount: 1 } }
      );
    } else if (digitsPressed === '9') {
      // They correctly flagged the call as suspicious.
      result.voiceReported = true;

      await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { reportedCount: 1 } }
      );
    } else {
      result.voiceOtherResponse = digitsPressed;
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

// Records that the employee filled in and submitted the fake login form.
// IMPORTANT: formFieldsSubmitted stores only FIELD NAMES (e.g. ['email', 'password']),
// never the actual values the employee typed — we never want real credentials
// touching our database, even in a simulation.
export const recordCredentialsSubmitted = async (
  token: string,
  campaignId: string,
  userId: string,
  formFieldsSubmitted: string[] = [],
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; alreadySubmitted?: boolean }> => {
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

    // Landing on the fake page implies a click — record it if not already done.
    if (!result.emailClicked) {
      result.emailClicked = true;
      result.emailClickedAt = new Date();
      result.clickIpAddress = ipAddress;
      result.clickUserAgent = userAgent;

      await Campaign.findByIdAndUpdate(
        campaignId,
        { $inc: { clickedCount: 1 } }
      );
    }

    if (result.credentialsSubmitted) {
      await result.save();
      return { success: true, alreadySubmitted: true };
    }

    result.credentialsSubmitted = true;
    result.credentialsSubmittedAt = new Date();
    result.formFieldsSubmitted = formFieldsSubmitted;

    await result.save();

    return { success: true };
  } catch (error) {
    console.error('recordCredentialsSubmitted error:', error);
    return { success: false };
  }
};

// Records that the employee correctly flagged the fake email/page as suspicious
// instead of falling for it — used for the "+points" reward flow.
export const recordPhishingReported = async (
  token: string,
  campaignId: string,
  userId: string,
  reportMethod: string = 'report_button'
): Promise<{ success: boolean; alreadyReported?: boolean }> => {
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

    if (result.reportedPhishing) {
      return { success: true, alreadyReported: true };
    }

    result.reportedPhishing = true;
    result.reportedAt = new Date();
    result.reportMethod = reportMethod;

    await result.save();

    await Campaign.findByIdAndUpdate(
      campaignId,
      { $inc: { reportedCount: 1 } }
    );

    return { success: true };
  } catch (error) {
    console.error('recordPhishingReported error:', error);
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