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
import { authenticate, authorize } from '../middleware/auth.js';

const campaignRouter = Router();

campaignRouter.use(authenticate);

campaignRouter.post('/', authorize('admin', 'super_admin'), createCampaign);
campaignRouter.get('/', getCampaigns);
campaignRouter.get('/:id', getCampaignById);
campaignRouter.patch('/:id', authorize('admin', 'super_admin'), updateCampaign);
campaignRouter.put('/:id', authorize('admin', 'super_admin'), updateCampaign);
campaignRouter.delete('/:id', authorize('admin', 'super_admin'), deleteCampaign);
campaignRouter.post('/:id/launch', authorize('admin', 'super_admin'), launchCampaign);
campaignRouter.post('/:id/pause', authorize('admin', 'super_admin'), pauseCampaign);

export default campaignRouter;
