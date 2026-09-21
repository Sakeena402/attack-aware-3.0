// backend/src/queues/workers.ts

import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();
import {
  riskQueue,
  campaignCounterQueue,
  adaptiveQuizQueue,
  RiskJob,
  CampaignCounterJob,
  AdaptiveQuizJobPayload,
  AdminQuizJobPayload,
} from './trackingQueue.js';
import { recalculateUserRisk, updateUserPoints } from '../services/analyticsService.js';
import { generateAdaptiveQuiz } from '../services/ai/adaptiveQuizService.js';
import { generateAdminQuiz } from '../services/ai/adminQuizService.js';
import { runMonthlyQuizGeneration } from '../services/ai/monthlyQuizService.js';
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

riskQueue.on('failed', (job, err) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ WORKER — concurrency 3
// ─────────────────────────────────────────────────────────────────────────────
adaptiveQuizQueue.process('*', 3, async (job) => {
  if (job.name === 'admin-quiz-generation') {
    const payload = job.data as AdminQuizJobPayload;
    console.log(
      `[ADMIN QUIZ WORKER] Generating quiz for employeeId=${payload.employeeId} topicMode=${payload.topicMode}`
    );
    const result = await generateAdminQuiz(payload);
    console.log(
      `[ADMIN QUIZ WORKER] ✓ Quiz generated quizId=${result.quizId} taskId=${result.taskId}`
    );
  } else if (job.name === 'monthly-scheduled-quiz-generation') {
    console.log('[MONTHLY QUIZ WORKER] Running monthly scheduled quiz generation');
    const summary = await runMonthlyQuizGeneration();
    console.log(
      `[MONTHLY QUIZ WORKER] ✓ Completed: ${summary.successfulCompanies} success, ${summary.failedCompanies} failed`
    );
  } else {
    const payload = job.data as AdaptiveQuizJobPayload;
    console.log(
      `[ADAPTIVE QUIZ WORKER] Generating quiz for employeeId=${payload.employeeId} eventType=${payload.eventType}`
    );
    const result = await generateAdaptiveQuiz(payload);
    console.log(
      `[ADAPTIVE QUIZ WORKER] ✓ Quiz generated quizId=${result.quizId} for employeeId=${payload.employeeId}`
    );
  }
});

adaptiveQuizQueue.on('failed', (job, err) => {
  console.error(
    `[QUIZ WORKER] Failed job="${job.name}":`,
    err.message
  );
});

// Register repeatable monthly cron job (1st of every month at midnight)
adaptiveQuizQueue
  .add('monthly-scheduled-quiz-generation', {}, { repeat: { cron: '0 0 1 * *' } })
  .catch((err) => console.error('[REPEATABLE JOB] Failed to register monthly quiz cron:', err.message));

console.log('[WORKERS] Risk + Counter + Adaptive/Admin/Monthly Quiz workers registered ✓');