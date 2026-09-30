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
  getMyActiveVishingCampaign,
} from '../controllers/campaignController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, isolateByCompany } from '../middleware/rbac.js';
import { enforceCampaignCreate, enforceCampaignLaunch } from '../middleware/planLimits.js';

import {
  getCampaignResults,
  compareCampaignsController,
} from '../controllers/campaignAnalyticsController.js';


const campaignRouter = Router();

campaignRouter.use(authenticate);

// Admin-only routes (campaign management)

// ADD these routes BEFORE the param routes (/:id)
campaignRouter.get('/compare', requireAdmin, isolateByCompany, compareCampaignsController);

// Any authenticated employee can check whether they currently have an
// active vishing campaign targeting them — used to show/hide the
// "Vishing Awareness" card on the employee dashboard. Must stay ABOVE
// the '/:id' route below, otherwise Express would treat
// "my-active-vishing" as an :id value.
campaignRouter.get('/my-active-vishing', getMyActiveVishingCampaign);

// ADD this route AFTER other /:id routes

campaignRouter.get('/:id/results', requireAdmin, isolateByCompany, getCampaignResults);

//campaignRouter.get('/',    requireAdmin, isolateByCompany, getAllCampaigns);


campaignRouter.post('/', requireAdmin, isolateByCompany, enforceCampaignCreate, createCampaign);
campaignRouter.get('/', isolateByCompany, getCampaigns);
campaignRouter.get('/:id', isolateByCompany, getCampaignById);
campaignRouter.patch('/:id', requireAdmin, isolateByCompany, updateCampaign);
campaignRouter.put('/:id', requireAdmin, isolateByCompany, updateCampaign);
campaignRouter.delete('/:id', requireAdmin, isolateByCompany, deleteCampaign);
campaignRouter.post('/:id/launch', requireAdmin, isolateByCompany, enforceCampaignLaunch, launchCampaign);
campaignRouter.post('/:id/pause', requireAdmin, isolateByCompany, pauseCampaign);

export default campaignRouter;