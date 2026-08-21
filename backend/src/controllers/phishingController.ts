import { Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import SimulationResult from '../models/SimulationResult.js';
import { AuthRequest, ApiResponse } from '../types/index.js';
import { sendPhishingEmail, generateTrackingToken, emailTemplates } from '../services/emailService.js';
import { hashToken } from '../services/twilioService.js';

export const getEmailTemplates = async (
  _req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const templates = Object.entries(emailTemplates).map(([key, value]) => ({
      key,
      name: value.name,
      subject: value.subject,
    }));

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch email templates' });
  }
};

export const sendPhishingSimulation = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new Error('User not authenticated');

    const { recipientEmail, templateKey, campaignId } = req.body;

    if (!recipientEmail || !templateKey || !campaignId) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const token = generateTrackingToken();
    const hashedToken = hashToken(token);

    const emailResult = await sendPhishingEmail({
      to: recipientEmail,
      templateKey: templateKey as keyof typeof emailTemplates,
      trackingToken: token,
      campaignId,
      userId: req.user.id,
    });

    if (!emailResult.success) {
      res.status(500).json({ success: false, error: emailResult.error });
      return;
    }

    await SimulationResult.create({
      userId: req.user.id,
      campaignId,
      simulationType: 'phishing',
      trackingToken: hashedToken,
      emailSent: true,
      emailSentAt: new Date(),
      emailAddress: recipientEmail,
      messageId: emailResult.messageId,
    });

    campaign.sentCount = (campaign.sentCount || 0) + 1;
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { campaignId, recipientEmail, templateKey },
      message: 'Phishing email sent successfully',
    });
  } catch (error) {
    console.error('sendPhishingSimulation error:', error);
    res.status(500).json({ success: false, error: 'Failed to send phishing email' });
  }
};

export const sendCampaignPhishing = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    if (!req.user) throw new Error('User not authenticated');

    const { campaignId } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: campaignId, ...companyFilter });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    if (campaign.type !== 'phishing') {
      res.status(400).json({ success: false, error: 'Campaign type is not phishing' });
      return;
    }

    const targetEmployees = campaign.targetEmployees as Array<{ _id: string; email?: string }>;

    if (!targetEmployees || targetEmployees.length === 0) {
      res.status(400).json({ success: false, error: 'No target employees for this campaign' });
      return;
    }

    const results = { total: targetEmployees.length, sent: 0, failed: 0 };
    const templateKey = (campaign.emailTemplate || 'bank_phishing') as keyof typeof emailTemplates;

    for (const target of targetEmployees) {
      const email = target.email;
      const userId = target._id?.toString();

      if (!email || !userId) continue;

      const token = generateTrackingToken();
      const hashedToken = hashToken(token);

      const emailResult = await sendPhishingEmail({
        to: email,
        templateKey,
        trackingToken: token,
        campaignId: campaign._id.toString(),
        userId,
      });

      await SimulationResult.create({
        userId,
        campaignId: campaign._id,
        simulationType: 'phishing',
        trackingToken: hashedToken,
        emailSent: emailResult.success,
        emailSentAt: new Date(),
        emailTemplate: templateKey,
        messageId: emailResult.messageId,
        emailAddress: email,
      });

      emailResult.success ? results.sent++ : results.failed++;
    }

    res.status(200).json({
      success: true,
      data: { campaign, results },
      message: `Phishing campaign sent: ${results.sent} sent, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('sendCampaignPhishing error:', error);
    res.status(500).json({ success: false, error: 'Failed to send phishing campaign' });
  }
};

export const getCampaignPhishingStats = async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const companyFilter = (req as any).companyFilter || {};

    const campaign = await Campaign.findOne({ _id: campaignId, ...companyFilter });
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const results = await SimulationResult.find({
      campaignId,
      simulationType: 'phishing',
    }).populate('userId', 'name email');

    const stats = {
      campaignId,
      campaignName: campaign.campaignName,
      totalTargets: campaign.targetCount || results.length,
      emailsSent: results.filter((r) => r.emailSent).length,
      emailsOpened: results.filter((r) => r.emailOpened).length,
      emailsClicked: results.filter((r) => r.emailClicked).length,
      credentialsSubmitted: results.filter((r) => r.credentialsSubmitted).length,
      openRate: 0,
      clickRate: 0,
      submissionRate: 0,
      details: results.map((r) => ({
        userId: r.userId,
        emailAddress: r.emailAddress,
        emailSent: r.emailSent,
        emailOpened: r.emailOpened,
        emailOpenedAt: r.emailOpenedAt,
        emailClicked: r.emailClicked,
        emailClickedAt: r.emailClickedAt,
        credentialsSubmitted: r.credentialsSubmitted,
        submittedAt: r.submittedAt,
      })),
    };

    const sent = stats.emailsSent;
    if (sent > 0) {
      stats.openRate = Math.round((stats.emailsOpened / sent) * 100);
      stats.clickRate = Math.round((stats.emailsClicked / sent) * 100);
      stats.submissionRate = Math.round((stats.credentialsSubmitted / sent) * 100);
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('getCampaignPhishingStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch phishing stats' });
  }
};