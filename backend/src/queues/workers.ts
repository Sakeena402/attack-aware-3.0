// backend/src/queues/workers.ts

import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();
import { riskQueue, campaignCounterQueue, RiskJob, CampaignCounterJob } from './trackingQueue.js';
import { recalculateUserRisk, updateUserPoints } from '../services/analyticsService.js';
import { Campaign } from '../models/Campaign.js';

// ─────────────────────────────────────────────────────────────────────────────
// RISK WORKER — concurrency 5
// ─────────────────────────────────────────────────────────────────────────────
riskQueue.process(5, async (job) => {
  const { userId, action } = job.data as RiskJob;
  console.log(`[RISK WORKER] userId=${userId} action=${action}`);
  await recalculateUserRisk(userId);
  await updateUserPoints(userId, action);
  console.log(`[RISK WORKER] ✓ Done userId=${userId}`);
});

riskQueue.on('failed',  (job, err) => {
  console.error(`[RISK WORKER] Failed userId=${job.data.userId}:`, err.message);
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN COUNTER WORKER — concurrency 10
// ─────────────────────────────────────────────────────────────────────────────
campaignCounterQueue.process(10, async (job) => {
  const { campaignId, field, increment } = job.data as CampaignCounterJob;
  await Campaign.findByIdAndUpdate(campaignId, { $inc: { [field]: increment } });
  console.log(`[COUNTER WORKER] ✓ ${field}+=${increment} campaign=${campaignId}`);
});

campaignCounterQueue.on('failed', (_job, err) => {
  console.error(`[COUNTER WORKER] Failed:`, err.message);
});

console.log('[WORKERS] Risk + Counter workers registered ✓');