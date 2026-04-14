

// backend/src/controllers/campaignController.ts
/* sakeena code
import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
*/
/*
//changes done by hifza
import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
import { sendSms, generateTrackingToken, smsTemplates } from '../services/twilioService.js';
import { ISimulationResult } from '../types/index.js';



//change done below by hifza
// campaignController.ts ke top me add karo
interface TargetEmployee {
  _id: string;   // MongoDB ObjectId string
  phone: string; // SMS bhejne ke liye number
}
//change completed here

export const createCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const {
      campaignName,
      type,
      description,
      endDate,
      startDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      voiceScript,
    } = req.body;

    if (!campaignName || !type) {
      throw new AppError('Campaign name and type are required', 400);
    }

    // Always use company from the verified token, never from the request body
    const companyId = req.user.companyId;
    if (!companyId) throw new AppError('Company ID not found on user', 400);

    const newCampaign = new Campaign({
      campaignName,
      type,
      description,
      companyId,
      createdBy: req.user.id,
      status: 'draft',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      targetEmployees: targetEmployees || [],
      targetDepartments: targetDepartments || [],
      emailTemplate: emailTemplate || '',
      smsTemplate: smsTemplate || '',
      voiceScript: voiceScript || '',
      clickRate: 0,
      reportRate: 0,
    });

    await newCampaign.save();

    res.status(201).json({ success: true, data: newCampaign });
  } catch (error) {
    // ye console.log below added by hifza for debugging, remove it in production
    console.error('CREATE CAMPAIGN ERROR:', error); // ← ye add karo
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
};

export const getCampaigns = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    // companyFilter is injected by isolateByCompany — never trust query params
    const companyFilter = (req as any).companyFilter || {};

    const campaigns = await Campaign.find(companyFilter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
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
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter })
      .populate('createdBy', 'name email');

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
};

export const updateCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const {
      campaignName,
      type,
      description,
      status,
      startDate,
      endDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      voiceScript,
    } = req.body;

    // Build update — only include fields that were actually sent
    const update: Record<string, unknown> = {};
    if (campaignName !== undefined)       update.campaignName = campaignName;
    if (type !== undefined)               update.type = type;
    if (description !== undefined)        update.description = description;
    if (status !== undefined)             update.status = status as CampaignStatus;
    if (startDate !== undefined)          update.startDate = new Date(startDate);
    if (endDate !== undefined)            update.endDate = new Date(endDate);
    if (targetEmployees !== undefined)    update.targetEmployees = targetEmployees;
    if (targetDepartments !== undefined)  update.targetDepartments = targetDepartments;
    if (emailTemplate !== undefined)      update.emailTemplate = emailTemplate;
    if (smsTemplate !== undefined)        update.smsTemplate = smsTemplate;
    if (voiceScript !== undefined)        update.voiceScript = voiceScript;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, ...companyFilter },
      update,
      { new: true, runValidators: true }
    );

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
};

export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOneAndDelete({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: { message: 'Campaign deleted successfully' } });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
};
//In this function changes done by hifza actual function body is commented below
//changes below done by hifza

export const launchCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    // Fetch campaign
    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);
//line added by hifza for testing, remove it in production
    const targetEmployees = [
  { _id: "testId1", phone: "+923001234567" } // ← yaha receiver number dalna hai
];

    // Activate campaign
    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    // 🔹 Smishing flow
    if (campaign.type === 'smishing' && Array.isArray(campaign.targetEmployees)) {
      const targetEmployees = campaign.targetEmployees as TargetEmployee[];

      for (const user of targetEmployees) {
        if (!user.phone) continue;

        const token = generateTrackingToken();

        // Send SMS
        const smsResult = await sendSms({
          to: user.phone,
          templateKey: (campaign.smsTemplate as keyof typeof smsTemplates) || 'bank_alert',
          trackingToken: token,
          campaignId: campaign._id.toString(),
          userId: user._id.toString(),
        });

        // Save SimulationResult
        const simulationData: Partial<ISimulationResult> = {
          userId: user._id,
          campaignId: campaign._id,
          simulationType: 'smishing',
          trackingToken: token,
          smsSent: smsResult.success,
          smsSentAt: new Date(),
          smsTemplate: campaign.smsTemplate || 'bank_alert',
          messageSid: smsResult.messageSid,
          phoneNumber: user.phone,
        };

        await SimulationResult.create(simulationData);
      }
    }

    res.status(200).json({
      success: true,
      data: campaign,
      message: 'Campaign launched and smishing triggered',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      console.error('Launch Campaign Error:', error);
      res.status(500).json({ success: false, error: 'Failed to launch campaign' });
    }
  }
};
  
  /* sakeena code 
  {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign launched successfully' });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to launch campaign' });
  }
};
*/
/*
export const pauseCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status !== 'active') throw new AppError('Campaign is not active', 400);

    campaign.status = 'paused';
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign paused successfully' });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to pause campaign' });
  }
};
*/

//hifza code
import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { AppError } from '../utils/errorHandler.js';
import { AuthRequest, ApiResponse, CampaignStatus } from '../types/index.js';
import { sendSms, generateTrackingToken, hashToken, smsTemplates } from '../services/twilioService.js';

interface TargetEmployee {
  _id: string;
  phone: string;
}

export const createCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const {
      campaignName,
      type,
      description,
      endDate,
      startDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      voiceScript,
    } = req.body;

    if (!campaignName || !type) {
      throw new AppError('Campaign name and type are required', 400);
    }

    const companyId = req.user.companyId;
    if (!companyId) throw new AppError('Company ID not found on user', 400);

    const newCampaign = new Campaign({
      campaignName,
      type,
      description,
      companyId,
      createdBy: req.user.id,
      status: 'draft',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      targetEmployees: targetEmployees || [],
      targetDepartments: targetDepartments || [],
      emailTemplate: emailTemplate || '',
      smsTemplate: smsTemplate || '',
      voiceScript: voiceScript || '',
      clickRate: 0,
      reportRate: 0,
    });

    await newCampaign.save();

    res.status(201).json({ success: true, data: newCampaign });
  } catch (error) {
    console.error('CREATE CAMPAIGN ERROR:', error);
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
};

export const getCampaigns = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('User not authenticated', 401);

    const companyFilter = (req as any).companyFilter || {};

    const campaigns = await Campaign.find(companyFilter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: campaigns });
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
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter })
      .populate('createdBy', 'name email');

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
};

export const updateCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const {
      campaignName,
      type,
      description,
      status,
      startDate,
      endDate,
      targetEmployees,
      targetDepartments,
      emailTemplate,
      smsTemplate,
      voiceScript,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (campaignName !== undefined)       update.campaignName = campaignName;
    if (type !== undefined)               update.type = type;
    if (description !== undefined)        update.description = description;
    if (status !== undefined)             update.status = status as CampaignStatus;
    if (startDate !== undefined)          update.startDate = new Date(startDate);
    if (endDate !== undefined)            update.endDate = new Date(endDate);
    if (targetEmployees !== undefined)    update.targetEmployees = targetEmployees;
    if (targetDepartments !== undefined)  update.targetDepartments = targetDepartments;
    if (emailTemplate !== undefined)      update.emailTemplate = emailTemplate;
    if (smsTemplate !== undefined)        update.smsTemplate = smsTemplate;
    if (voiceScript !== undefined)        update.voiceScript = voiceScript;

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, ...companyFilter },
      update,
      { new: true, runValidators: true }
    );

    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: campaign });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
};

export const deleteCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOneAndDelete({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);

    res.json({ success: true, data: { message: 'Campaign deleted successfully' } });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
};

export const launchCampaign = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { id } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status === 'active') throw new AppError('Campaign is already active', 400);

    if (campaign.type !== 'smishing') {
      campaign.status = 'active';
      campaign.startDate = new Date();
      await campaign.save();
      return res.json({ success: true, data: campaign, message: 'Campaign launched successfully' });
    }

    const targets = campaign.targetEmployees as TargetEmployee[];
    console.log('TARGET EMPLOYEES:', JSON.stringify(targets)); // ← YE ADD KARO(HIFZA)
    

    if (!targets || targets.length === 0) {
      throw new AppError('No target employees found on this campaign. Add employees before launching.', 400);
    }

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    const results = { total: targets.length, sent: 0, failed: 0 };

    for (const target of targets) {
      const phone = target.phone;
      const userId = target._id?.toString();

      if (!phone || !userId) continue;

      const rawToken = generateTrackingToken();
      const hashedToken = hashToken(rawToken);

      const smsResult = await sendSms({
        to: phone,
        templateKey: (campaign.smsTemplate as keyof typeof smsTemplates) || 'bank_alert',
        trackingToken: rawToken,
        campaignId: campaign._id.toString(),
        userId,
      });

      await SimulationResult.create({
        userId,
        campaignId: campaign._id,
        simulationType: 'smishing',
        trackingToken: hashedToken,
        smsSent: smsResult.success,
        smsSentAt: new Date(),
        smsTemplate: campaign.smsTemplate || 'bank_alert',
        messageSid: smsResult.messageSid,
        phoneNumber: phone,
      });

      smsResult.success ? results.sent++ : results.failed++;
    }

    res.status(200).json({
      success: true,
      data: { campaign, results },
      message: `Campaign launched: ${results.sent} sent, ${results.failed} failed`,
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      console.error('Launch Campaign Error:', error);
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
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: id, ...companyFilter });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (campaign.status !== 'active') throw new AppError('Campaign is not active', 400);

    campaign.status = 'paused';
    await campaign.save();

    res.json({ success: true, data: campaign, message: 'Campaign paused successfully' });
  } catch (error) {
    if (error instanceof AppError)
      res.status(error.statusCode).json({ success: false, error: error.message });
    else
      res.status(500).json({ success: false, error: 'Failed to pause campaign' });
  }
};
