// backend/src/routes/simulations.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { enforceChannelSend } from '../middleware/planLimits.js';
import {
  sendSmishingSimulation,
  sendCampaignSmishing,
  getSmsTemplates,
  getCampaignSmishingStats,
} from '../controllers/smishingController.js';

// Vishing
import {
  sendVishingSimulation,
  sendCampaignVishing,
  getVoiceScripts,
  getCampaignVishingStats,
  simulateVoiceResponse,
} from '../controllers/vishingController.js';

// Phishing
import {
  getEmailTemplates,
  sendPhishingSimulation,
  sendCampaignPhishing,
  getCampaignPhishingStats,
} from '../controllers/phishingController.js';

const simulationsRouter = Router();

// All simulation routes require authentication
simulationsRouter.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// SMS / SMISHING
// ─────────────────────────────────────────────────────────────────────────────
simulationsRouter.get('/sms/templates', getSmsTemplates);
simulationsRouter.post(
  '/sms/send',
  authorize('admin', 'super_admin'),
  enforceChannelSend('smishing'),
  sendSmishingSimulation
);
simulationsRouter.post(
  '/sms/campaign/:campaignId',
  authorize('admin', 'super_admin'),
  enforceChannelSend('smishing'),
  sendCampaignSmishing
);
simulationsRouter.get('/sms/stats/:campaignId', getCampaignSmishingStats);

// ─────────────────────────────────────────────────────────────────────────────
// VOICE / VISHING
// ─────────────────────────────────────────────────────────────────────────────
simulationsRouter.get('/voice/scripts', getVoiceScripts);
simulationsRouter.post(
  '/voice/call',
  authorize('admin', 'super_admin'),
  enforceChannelSend('vishing'),
  sendVishingSimulation
);
simulationsRouter.post(
  '/voice/campaign/:campaignId',
  authorize('admin', 'super_admin'),
  enforceChannelSend('vishing'),
  sendCampaignVishing
);
simulationsRouter.get('/voice/stats/:campaignId', getCampaignVishingStats);

simulationsRouter.post(
  '/voice/simulate-response',
  authorize('admin', 'super_admin'),
  simulateVoiceResponse
);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL / PHISHING
// ─────────────────────────────────────────────────────────────────────────────
simulationsRouter.get('/email/templates', getEmailTemplates);
simulationsRouter.post(
  '/email/send',
  authorize('admin', 'super_admin'),
  enforceChannelSend('phishing'),
  sendPhishingSimulation
);
simulationsRouter.post(
  '/email/campaign/:campaignId',
  authorize('admin', 'super_admin'),
  enforceChannelSend('phishing'),
  sendCampaignPhishing
);
simulationsRouter.get('/email/stats/:campaignId', getCampaignPhishingStats);

export default simulationsRouter;