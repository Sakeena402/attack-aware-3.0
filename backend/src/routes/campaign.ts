  //backend/src/routes/campaign.ts

import { Router } from 'express';
import {
  
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
} from '../controllers/campaignController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, isolateByCompany } from '../middleware/rbac.js';

import {
  getCampaignResults,
  compareCampaignsController,
} from '../controllers/campaignAnalyticsController.js';


const campaignRouter = Router();

campaignRouter.use(authenticate);

// Admin-only routes (campaign management)

// ADD these routes BEFORE the param routes (/:id)
campaignRouter.get('/compare', requireAdmin, isolateByCompany, compareCampaignsController);

// ADD this route AFTER other /:id routes

campaignRouter.get('/:id/results', requireAdmin, isolateByCompany, getCampaignResults);

//campaignRouter.get('/',    requireAdmin, isolateByCompany, getAllCampaigns);


campaignRouter.post('/', requireAdmin, isolateByCompany, createCampaign);
campaignRouter.get('/', isolateByCompany, getCampaigns);
campaignRouter.get('/:id', isolateByCompany, getCampaignById);
campaignRouter.patch('/:id', requireAdmin, isolateByCompany, updateCampaign);
campaignRouter.put('/:id', requireAdmin, isolateByCompany, updateCampaign);
campaignRouter.delete('/:id', requireAdmin, isolateByCompany, deleteCampaign);
campaignRouter.post('/:id/launch', requireAdmin, isolateByCompany, launchCampaign);
campaignRouter.post('/:id/pause', requireAdmin, isolateByCompany, pauseCampaign);

export default campaignRouter;




