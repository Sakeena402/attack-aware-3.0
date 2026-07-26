import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  sendSmishingSimulation,
  sendCampaignSmishing,
  getSmsTemplates,
  getCampaignSmishingStats,
} from '../controllers/smishingController.js';
import {
  sendVishingSimulation,
  sendCampaignVishing,
  getVoiceScripts,
  getCampaignVishingStats,
} from '../controllers/vishingController.js';
import {
  getEmailTemplates,
  sendPhishingSimulation,
  sendCampaignPhishing,
  getCampaignPhishingStats,
} from '../controllers/phishingController.js';

const simulationsRouter = Router();

simulationsRouter.use(authenticate);

simulationsRouter.get('/sms/templates', getSmsTemplates);
simulationsRouter.post('/sms/send', authorize('admin', 'super_admin'), sendSmishingSimulation);
simulationsRouter.post('/sms/campaign/:campaignId', authorize('admin', 'super_admin'), sendCampaignSmishing);
simulationsRouter.get('/sms/stats/:campaignId', getCampaignSmishingStats);

simulationsRouter.get('/voice/scripts', getVoiceScripts);
simulationsRouter.post('/voice/call', authorize('admin', 'super_admin'), sendVishingSimulation);
simulationsRouter.post('/voice/campaign/:campaignId', authorize('admin', 'super_admin'), sendCampaignVishing);
simulationsRouter.get('/voice/stats/:campaignId', getCampaignVishingStats);

simulationsRouter.get('/email/templates', getEmailTemplates);
simulationsRouter.post('/email/send', authorize('admin', 'super_admin'), sendPhishingSimulation);
simulationsRouter.post('/email/campaign/:campaignId', authorize('admin', 'super_admin'), sendCampaignPhishing);
simulationsRouter.get('/email/stats/:campaignId', getCampaignPhishingStats);

export default simulationsRouter;