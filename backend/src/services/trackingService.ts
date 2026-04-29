
// backend/src/services/trackingService.ts  (QUEUE VERSION)


import mongoose from 'mongoose';
import SimulationResult from '../models/SimulationResult.js';
import { generateTrackingToken, hashToken } from './twilioService.js';
import {
  enqueueRiskUpdate,
  enqueueCampaignCounter,
} from '../queues/trackingQueue.js';
import { recalculateUserRisk, updateUserPoints } from './analyticsService.js';
import { Campaign } from '../models/Campaign.js';

export const recordSmsSent = async (data: {
  campaignId:    string;
  userId:        string;
  trackingToken: string;   // raw UUID — hashed here
  messageSid:    string;
  phoneNumber:   string;
  templateKey:   string;
}): Promise<void> => {
  const hashedToken = hashToken(data.trackingToken);

  // 1 upsert — creates or updates
  await SimulationResult.findOneAndUpdate(
    {
      campaignId:    new mongoose.Types.ObjectId(data.campaignId),
      userId:        new mongoose.Types.ObjectId(data.userId),
      trackingToken: hashedToken,
    },
    {
      $set: {
        simulationType: 'smishing',
        smsSent:        true,
        smsSentAt:      new Date(),
        smsDelivered:   true,
        smsDeliveredAt: new Date(),
        messageSid:     data.messageSid,
        phoneNumber:    data.phoneNumber,
        smsTemplate:    data.templateKey,
        timestamp:      new Date(),
      },
      $setOnInsert: {
        smsLinkClicked:       false,
        credentialsSubmitted: false,
        reportedPhishing:     false,
        formFieldsSubmitted:  [],
      },
    },
    { upsert: true, new: true }
  );

  // Queue counter update (don't await — fire and forget)
  enqueueCampaignCounter({
    campaignId: data.campaignId,
    field:      'deliveredCount',
    increment:  1,
  }).catch(err => console.error('[QUEUE] Failed to enqueue deliveredCount:', err));
};

// ─────────────────────────────────────────────────────────────────────────────
// recordCallInitiated
// ─────────────────────────────────────────────────────────────────────────────
export const recordCallInitiated = async (data: {
  campaignId:    string;
  userId:        string;
  trackingToken: string;
  callSid:       string;
  phoneNumber:   string;
  scriptKey:     string;
}): Promise<void> => {
  const hashedToken = hashToken(data.trackingToken);

  await SimulationResult.findOneAndUpdate(
    {
      campaignId:    new mongoose.Types.ObjectId(data.campaignId),
      userId:        new mongoose.Types.ObjectId(data.userId),
      trackingToken: hashedToken,
    },
    {
      $set: {
        simulationType:  'vishing',
        callInitiated:   true,
        callInitiatedAt: new Date(),
        callSid:         data.callSid,
        phoneNumber:     data.phoneNumber,
        voiceScript:     data.scriptKey,
        timestamp:       new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// recordSmsClick
//
// DB CALLS: 1 write (was 7)
// Risk/points: queued → background
// ─────────────────────────────────────────────────────────────────────────────
export const recordSmsClick = async (
  trackingToken: string,
  campaignId:    string,
  userId:        string,
  ipAddress?:    string,
  userAgent?:    string
): Promise<{ success: boolean; alreadyClicked: boolean }> => {
  const hashedToken = hashToken(trackingToken);

  // 1 atomic write
  const updated = await SimulationResult.findOneAndUpdate(
    {
      campaignId:     new mongoose.Types.ObjectId(campaignId),
      userId:         new mongoose.Types.ObjectId(userId),
      trackingToken:  hashedToken,
      smsLinkClicked: { $ne: true },
    },
    {
      $set: {
        smsLinkClicked: true,
        smsClickedAt:   new Date(),
        clickIpAddress: ipAddress ?? '',
        clickUserAgent: userAgent ?? '',
      },
    },
    { new: true }
  );

  if (!updated) {
    const exists = await SimulationResult.exists({
      campaignId:    new mongoose.Types.ObjectId(campaignId),
      userId:        new mongoose.Types.ObjectId(userId),
      trackingToken: hashedToken,
    });
    return { success: !!exists, alreadyClicked: !!exists };
  }

  // Queue background work — DO NOT await
  enqueueRiskUpdate({ userId, action: 'click', campaignId })
    .catch(err => console.error('[QUEUE] Failed to enqueue risk:', err));

  enqueueCampaignCounter({ campaignId, field: 'clickedCount', increment: 1 })
    .catch(err => console.error('[QUEUE] Failed to enqueue counter:', err));

  return { success: true, alreadyClicked: false };
};

// ─────────────────────────────────────────────────────────────────────────────
// recordCredentialsSubmitted
//
// DB CALLS: 1-2 writes (was 6)
// ─────────────────────────────────────────────────────────────────────────────
export const recordCredentialsSubmitted = async (
  trackingToken: string,
  campaignId:    string,
  userId:        string,
  formData:      Record<string, unknown>
): Promise<{ success: boolean }> => {
  const hashedToken = hashToken(trackingToken);
  const formFields  = Object.keys(formData).filter(
    k => !['token', 'campaignId', 'userId'].includes(k)
  );

  // PRIMARY: find by full key
  let updated = await SimulationResult.findOneAndUpdate(
    {
      campaignId:           new mongoose.Types.ObjectId(campaignId),
      userId:               new mongoose.Types.ObjectId(userId),
      trackingToken:        hashedToken,
      credentialsSubmitted: { $ne: true },
    },
    {
      $set: {
        credentialsSubmitted:   true,
        credentialsSubmittedAt: new Date(),
        formFieldsSubmitted:    formFields,
      },
    },
    { new: true }
  );

  // FALLBACK: find by campaignId + userId only
  if (!updated) {
    const existing = await SimulationResult.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      userId:     new mongoose.Types.ObjectId(userId),
    });

    if (existing) {
      if (existing.credentialsSubmitted) return { success: true };
      existing.credentialsSubmitted   = true;
      existing.credentialsSubmittedAt = new Date();
      existing.formFieldsSubmitted    = formFields;
      await existing.save();
      updated = existing;
    } else {
      // Create new (bypassed link)
      await SimulationResult.findOneAndUpdate(
        {
          campaignId:    new mongoose.Types.ObjectId(campaignId),
          userId:        new mongoose.Types.ObjectId(userId),
          trackingToken: hashedToken,
        },
        {
          $set: {
            simulationType:         'smishing',
            credentialsSubmitted:   true,
            credentialsSubmittedAt: new Date(),
            formFieldsSubmitted:    formFields,
            timestamp:              new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  // Queue background work
  enqueueRiskUpdate({ userId, action: 'credentials', campaignId })
    .catch(err => console.error('[QUEUE] Failed to enqueue risk:', err));

  return { success: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// recordPhishingReported
//
// DB CALLS: 1-2 writes (was 7)
// ─────────────────────────────────────────────────────────────────────────────
export const recordPhishingReported = async (
  trackingToken: string,
  campaignId:    string,
  userId:        string,
  reportMethod:  string = 'button'
): Promise<{ success: boolean }> => {
  const hashedToken = hashToken(trackingToken);

  let updated = await SimulationResult.findOneAndUpdate(
    {
      campaignId:       new mongoose.Types.ObjectId(campaignId),
      userId:           new mongoose.Types.ObjectId(userId),
      trackingToken:    hashedToken,
      reportedPhishing: { $ne: true },
    },
    {
      $set: {
        reportedPhishing: true,
        reportedAt:       new Date(),
        reportMethod,
      },
    },
    { new: true }
  );

  if (!updated) {
    const existing = await SimulationResult.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      userId:     new mongoose.Types.ObjectId(userId),
    });

    if (existing) {
      if (existing.reportedPhishing) return { success: true };
      existing.reportedPhishing = true;
      existing.reportedAt       = new Date();
      existing.reportMethod     = reportMethod;
      await existing.save();
      updated = existing;
    } else {
      await SimulationResult.findOneAndUpdate(
        {
          campaignId:    new mongoose.Types.ObjectId(campaignId),
          userId:        new mongoose.Types.ObjectId(userId),
          trackingToken: hashedToken,
        },
        {
          $set: {
            simulationType:   'smishing',
            reportedPhishing: true,
            reportedAt:       new Date(),
            reportMethod,
            timestamp:        new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  enqueueRiskUpdate({ userId, action: 'report', campaignId })
    .catch(err => console.error('[QUEUE] Failed to enqueue risk:', err));

  enqueueCampaignCounter({ campaignId, field: 'reportedCount', increment: 1 })
    .catch(err => console.error('[QUEUE] Failed to enqueue counter:', err));

  return { success: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// recordVoiceResponse
// ─────────────────────────────────────────────────────────────────────────────
export const recordVoiceResponse = async (data: {
  callSid:       string;
  digitsPressed: string;
  campaignId:    string;
  userId:        string;
}): Promise<{ success: boolean; responseType: string }> => {
  const result = await SimulationResult.findOne({ callSid: data.callSid });
  if (!result) return { success: false, responseType: 'unknown' };

  let responseType = 'unknown';
  let action: 'click' | 'credentials' | 'report' | null = null;

  switch (data.digitsPressed) {
    case '1':
      responseType        = 'engaged';
      result.voiceEngaged = true;
      action              = 'click';
      break;
    case '2':
      responseType         = 'verified';
      result.voiceVerified = true;
      action               = 'credentials';
      break;
    case '9':
      responseType         = 'reported';
      result.voiceReported = true;
      action               = 'report';
      enqueueCampaignCounter({ campaignId: data.campaignId, field: 'reportedCount', increment: 1 })
        .catch(() => {});
      break;
    default:
      responseType              = 'other';
      result.voiceOtherResponse = data.digitsPressed;
  }

  result.callResponse   = data.digitsPressed;
  result.callResponseAt = new Date();
  await result.save();

  if (action) {
    enqueueRiskUpdate({ userId: data.userId, action, campaignId: data.campaignId })
      .catch(() => {});
  }

  return { success: true, responseType };
};

// ─────────────────────────────────────────────────────────────────────────────
// recordCallStatus + recordSmsStatus — unchanged (webhook callbacks, not hot path)
// ─────────────────────────────────────────────────────────────────────────────
export const recordCallStatus = async (data: {
  callSid: string; status: string; duration?: number; answeredBy?: string;
}): Promise<void> => {
  const result = await SimulationResult.findOne({ callSid: data.callSid });
  if (!result) return;

  result.callStatus = data.status;
  if (data.status === 'answered' || data.status === 'in-progress') {
    result.callAnswered = true; result.callAnsweredAt = new Date();
  }
  if (data.status === 'completed') {
    result.callCompleted = true; result.callCompletedAt = new Date();
    result.callDuration = data.duration;
  }
  if (data.answeredBy) result.answeredBy = data.answeredBy;
  await result.save();
};

export const recordSmsStatus = async (data: {
  messageSid: string; status: string; errorCode?: string; errorMessage?: string;
}): Promise<void> => {
  const result = await SimulationResult.findOne({ messageSid: data.messageSid });
  if (!result) return;

  result.smsDeliveryStatus = data.status;
  if (data.status === 'delivered') {
    result.smsDelivered = true; result.smsDeliveredAt = new Date();
  }
  if (data.status === 'failed' || data.status === 'undelivered') {
    result.smsDelivered     = false;
    result.smsDeliveryError = data.errorMessage;
    result.smsErrorCode     = data.errorCode;
  }
  await result.save();
};

// ─────────────────────────────────────────────────────────────────────────────
// getCampaignSimulationStats — aggregation-based
// ─────────────────────────────────────────────────────────────────────────────
export const getCampaignSimulationStats = async (campaignId: string) => {
  const cid = new mongoose.Types.ObjectId(campaignId);

  const [agg] = await SimulationResult.aggregate([
    { $match: { campaignId: cid } },
    {
      $group: {
        _id:                  null,
        total:                { $sum: 1 },
        smsSent:              { $sum: { $cond: [{ $eq: ['$smsSent',              true] }, 1, 0] } },
        smsDelivered:         { $sum: { $cond: [{ $eq: ['$smsDelivered',         true] }, 1, 0] } },
        smsClicked:           { $sum: { $cond: [{ $eq: ['$smsLinkClicked',       true] }, 1, 0] } },
        credentialsSubmitted: { $sum: { $cond: [{ $eq: ['$credentialsSubmitted', true] }, 1, 0] } },
        reported: {
          $sum: { $cond: [{ $or: [{ $eq: ['$reportedPhishing', true] }, { $eq: ['$voiceReported', true] }] }, 1, 0] },
        },
        callsInitiated: { $sum: { $cond: [{ $eq: ['$callInitiated', true] }, 1, 0] } },
        callsAnswered:  { $sum: { $cond: [{ $eq: ['$callAnswered',  true] }, 1, 0] } },
        callsEngaged: {
          $sum: { $cond: [{ $or: [{ $eq: ['$voiceEngaged', true] }, { $eq: ['$voiceVerified', true] }] }, 1, 0] },
        },
        callsReported: { $sum: { $cond: [{ $eq: ['$voiceReported', true] }, 1, 0] } },
      },
    },
  ]);

  return agg ?? {
    total: 0, smsSent: 0, smsDelivered: 0, smsClicked: 0,
    credentialsSubmitted: 0, reported: 0, callsInitiated: 0,
    callsAnswered: 0, callsEngaged: 0, callsReported: 0,
  };
};

export const createTrackingRecord = async (data: {
  campaignId: string; userId: string; type: 'sms' | 'voice' | 'email';
  templateKey: string; phoneNumber?: string;
}) => {
  const token      = generateTrackingToken();
  const hashedToken = hashToken(token);
  return { ...data, token, hashedToken };
};

export default {
  createTrackingRecord, recordSmsSent, recordCallInitiated,
  recordSmsClick, recordCredentialsSubmitted, recordPhishingReported,
  recordVoiceResponse, recordCallStatus, recordSmsStatus,
  getCampaignSimulationStats,
};