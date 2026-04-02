import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import  SimulationResult  from '../models/SimulationResult.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';

export const createCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { campaignName, type, description, companyId, endDate } = req.body;

    const newCampaign = new Campaign({
      campaignName,
      type,
      description,
      companyId,
      createdBy: req.user.id,
      status: 'draft',
      startDate: new Date(),
      endDate: endDate ? new Date(endDate) : null,
    });

    await newCampaign.save();

    res.status(201).json({
      success: true,
      data: newCampaign,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
    }
  }
};

export const getCampaigns = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { companyId } = req.query;
    const campaigns = await Campaign.find({ companyId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
};

export const getCampaignById = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id)
      .populate('createdBy', 'name email');

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
    }
  }
};

export const updateCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, campaignName, description } = req.body;

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      {
        status: status as CampaignStatus,
        campaignName,
        description,
      },
      { new: true }
    );

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update campaign' });
    }
  }
};

export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
    }
  }
};

export const launchCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.status === 'active') {
      throw new AppError('Campaign is already active', 400);
    }

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign launched successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to launch campaign' });
    }
  }
};

export const pauseCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    if (campaign.status !== 'active') {
      throw new AppError('Campaign is not active', 400);
    }

    campaign.status = 'paused';
    await campaign.save();

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign paused successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to pause campaign' });
    }
  }
};
