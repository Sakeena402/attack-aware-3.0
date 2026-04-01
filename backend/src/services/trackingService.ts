import SimulationResult from '../models/SimulationResult.js';
import {Campaign} from '../models/Campaign.js';
import { User } from '../models/User.js';
import { generateTrackingToken, hashToken } from './twilioService.js';

export interface TrackingData {
  campaignId: string;
  userId: string;
  token: string;
  hashedToken: string;
  type: 'sms' | 'voice' | 'email';
  templateKey: string;
  phoneNumber?: string;
  messageSid?: string;
  callSid?: string;
}

// Create tracking record for a simulation
export const createTrackingRecord = async (data: {
  campaignId: string;
  userId: string;
  type: 'sms' | 'voice' | 'email';
  templateKey: string;
  phoneNumber?: string;
}): Promise<TrackingData> => {
  const token = generateTrackingToken();
  const hashedToken = hashToken(token);

  return {
    campaignId: data.campaignId,
    userId: data.userId,
    token,
    hashedToken,
    type: data.type,
    templateKey: data.templateKey,
    phoneNumber: data.phoneNumber,
  };
};

// Record SMS sent
export const recordSmsSent = async (data: {
  campaignId: string;
  userId: string;
  trackingToken: string;
  messageSid: string;
  phoneNumber: string;
  templateKey: string;
}): Promise<void> => {
  await SimulationResult.create({
    campaignId: data.campaignId,
    userId: data.userId,
    trackingToken: hashToken(data.trackingToken),
    simulationType: 'smishing',
    smsSent: true,
    smsSentAt: new Date(),
    messageSid: data.messageSid,
    phoneNumber: data.phoneNumber,
    smsTemplate: data.templateKey,
    timestamp: new Date(),
  });
};

// Record voice call initiated
export const recordCallInitiated = async (data: {
  campaignId: string;
  userId: string;
  trackingToken: string;
  callSid: string;
  phoneNumber: string;
  scriptKey: string;
}): Promise<void> => {
  await SimulationResult.create({
    campaignId: data.campaignId,
    userId: data.userId,
    trackingToken: hashToken(data.trackingToken),
    simulationType: 'vishing',
    callInitiated: true,
    callInitiatedAt: new Date(),
    callSid: data.callSid,
    phoneNumber: data.phoneNumber,
    voiceScript: data.scriptKey,
    timestamp: new Date(),
  });
};

// Record SMS link click
export const recordSmsClick = async (
  trackingToken: string,
  campaignId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; alreadyClicked: boolean }> => {
  const hashedToken = hashToken(trackingToken);

  // Find existing record
  const result = await SimulationResult.findOne({
    campaignId,
    userId,
    trackingToken: hashedToken,
  });

  if (!result) {
    return { success: false, alreadyClicked: false };
  }

  if (result.smsLinkClicked) {
    return { success: true, alreadyClicked: true };
  }

  // Update record
  result.smsLinkClicked = true;
  result.smsClickedAt = new Date();
  result.clickIpAddress = ipAddress;
  result.clickUserAgent = userAgent;
  await result.save();

  // Update user risk score
  await updateUserRiskScore(userId, 'clicked_link');

  return { success: true, alreadyClicked: false };
};

// Record credentials submitted on phishing page
export const recordCredentialsSubmitted = async (
  trackingToken: string,
  campaignId: string,
  userId: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean }> => {
  const hashedToken = hashToken(trackingToken);

  const result = await SimulationResult.findOne({
    campaignId,
    userId,
    trackingToken: hashedToken,
  });

  if (!result) {
    return { success: false };
  }

  // DO NOT store actual credentials - only mark as compromised
  result.credentialsSubmitted = true;
  result.credentialsSubmittedAt = new Date();
  result.formFieldsSubmitted = Object.keys(formData); // Only store field names
  await result.save();

  // Update user risk score
  await updateUserRiskScore(userId, 'submitted_credentials');

  return { success: true };
};

// Record phishing reported
export const recordPhishingReported = async (
  trackingToken: string,
  campaignId: string,
  userId: string,
  reportMethod: string = 'button'
): Promise<{ success: boolean }> => {
  const hashedToken = hashToken(trackingToken);

  const result = await SimulationResult.findOne({
    campaignId,
    userId,
    trackingToken: hashedToken,
  });

  if (!result) {
    // Create a new record if user reports without clicking
    await SimulationResult.create({
      campaignId,
      userId,
      trackingToken: hashedToken,
      reportedPhishing: true,
      reportedAt: new Date(),
      reportMethod,
      timestamp: new Date(),
    });
  } else {
    result.reportedPhishing = true;
    result.reportedAt = new Date();
    result.reportMethod = reportMethod;
    await result.save();
  }

  // Update user points for correct identification
  await updateUserPoints(userId, 50, 'Reported phishing attempt');

  return { success: true };
};

// Record voice call response
export const recordVoiceResponse = async (data: {
  callSid: string;
  digitsPressed: string;
  campaignId: string;
  userId: string;
}): Promise<{ success: boolean; responseType: string }> => {
  const result = await SimulationResult.findOne({
    callSid: data.callSid,
  });

  if (!result) {
    return { success: false, responseType: 'unknown' };
  }

  let responseType = 'unknown';
  
  switch (data.digitsPressed) {
    case '1':
      responseType = 'engaged'; // User pressed to speak with "representative"
      result.voiceEngaged = true;
      await updateUserRiskScore(data.userId, 'voice_engaged');
      break;
    case '2':
      responseType = 'verified'; // User pressed to verify details
      result.voiceVerified = true;
      await updateUserRiskScore(data.userId, 'voice_verified');
      break;
    case '9':
      responseType = 'reported'; // User reported as suspicious
      result.voiceReported = true;
      await updateUserPoints(data.userId, 75, 'Reported suspicious call');
      break;
    default:
      responseType = 'other';
      result.voiceOtherResponse = data.digitsPressed;
  }

  result.callResponseAt = new Date();
  result.callResponse = data.digitsPressed;
  await result.save();

  return { success: true, responseType };
};

// Record call status update from Twilio webhook
export const recordCallStatus = async (data: {
  callSid: string;
  status: string;
  duration?: number;
  answeredBy?: string;
}): Promise<void> => {
  const result = await SimulationResult.findOne({ callSid: data.callSid });

  if (!result) return;

  result.callStatus = data.status;
  
  if (data.status === 'answered' || data.status === 'in-progress') {
    result.callAnswered = true;
    result.callAnsweredAt = new Date();
  }
  
  if (data.status === 'completed') {
    result.callCompleted = true;
    result.callCompletedAt = new Date();
    result.callDuration = data.duration;
  }

  if (data.answeredBy) {
    result.answeredBy = data.answeredBy; // human, machine, etc.
  }

  await result.save();
};

// Record SMS delivery status from Twilio webhook
export const recordSmsStatus = async (data: {
  messageSid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> => {
  const result = await SimulationResult.findOne({ messageSid: data.messageSid });

  if (!result) return;

  result.smsDeliveryStatus = data.status;
  
  if (data.status === 'delivered') {
    result.smsDelivered = true;
    result.smsDeliveredAt = new Date();
  }
  
  if (data.status === 'failed' || data.status === 'undelivered') {
    result.smsDeliveryError = data.errorMessage;
    result.smsErrorCode = data.errorCode;
  }

  await result.save();
};

// Update user risk score based on actions
const updateUserRiskScore = async (userId: string, action: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  const riskScoreMap: Record<string, number> = {
    clicked_link: 15,
    submitted_credentials: 30,
    voice_engaged: 20,
    voice_verified: 25,
  };

  const scoreIncrease = riskScoreMap[action] || 0;
  user.riskScore = Math.min(100, (user.riskScore || 0) + scoreIncrease);

  // Update risk level based on score
  if (user.riskScore >= 70) {
    user.riskLevel = 'high';
  } else if (user.riskScore >= 40) {
    user.riskLevel = 'medium';
  } else {
    user.riskLevel = 'low';
  }

  await user.save();
};

// Update user points for positive actions
const updateUserPoints = async (
  userId: string,
  points: number,
  reason: string
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  user.points = (user.points || 0) + points;

  // Update badge based on points
  if (user.points >= 1000) {
    user.badge = 'Security Champion';
  } else if (user.points >= 500) {
    user.badge = 'Security Expert';
  } else if (user.points >= 250) {
    user.badge = 'Security Aware';
  } else if (user.points >= 100) {
    user.badge = 'Security Learner';
  }

  // Decrease risk score for positive behavior
  user.riskScore = Math.max(0, (user.riskScore || 0) - 5);

  await user.save();
};

// Get campaign simulation statistics
export const getCampaignSimulationStats = async (campaignId: string): Promise<{
  total: number;
  smsSent: number;
  smsDelivered: number;
  smsClicked: number;
  credentialsSubmitted: number;
  reported: number;
  callsInitiated: number;
  callsAnswered: number;
  callsEngaged: number;
  callsReported: number;
}> => {
  const results = await SimulationResult.find({ campaignId });

  return {
    total: results.length,
    smsSent: results.filter(r => r.smsSent).length,
    smsDelivered: results.filter(r => r.smsDelivered).length,
    smsClicked: results.filter(r => r.smsLinkClicked).length,
    credentialsSubmitted: results.filter(r => r.credentialsSubmitted).length,
    reported: results.filter(r => r.reportedPhishing || r.voiceReported).length,
    callsInitiated: results.filter(r => r.callInitiated).length,
    callsAnswered: results.filter(r => r.callAnswered).length,
    callsEngaged: results.filter(r => r.voiceEngaged || r.voiceVerified).length,
    callsReported: results.filter(r => r.voiceReported).length,
  };
};

export default {
  createTrackingRecord,
  recordSmsSent,
  recordCallInitiated,
  recordSmsClick,
  recordCredentialsSubmitted,
  recordPhishingReported,
  recordVoiceResponse,
  recordCallStatus,
  recordSmsStatus,
  getCampaignSimulationStats,
};
