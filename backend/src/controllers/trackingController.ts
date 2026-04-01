import { Request, Response } from 'express';
import {
  recordSmsClick,
  recordCredentialsSubmitted,
  recordPhishingReported,
} from '../services/trackingService.js';
import { generatePhishingPageUrl } from '../services/twilioService.js';

// Handle SMS link click tracking
export const handleLinkClick = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { t: token, c: campaignId, u: userId, p: pageType } = req.query as {
      t: string;
      c: string;
      u: string;
      p?: string;
    };

    if (!token || !campaignId || !userId) {
      res.status(400).json({ error: 'Missing tracking parameters' });
      return;
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    const result = await recordSmsClick(
      token,
      campaignId,
      userId,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      // Still redirect to phishing page even if tracking fails
      // This maintains the simulation experience
    }

    // Redirect to the appropriate phishing page
    const phishingUrl = generatePhishingPageUrl(token, pageType || 'bank');
    res.redirect(302, phishingUrl);
  } catch (error) {
    console.error('Link click tracking error:', error);
    // Redirect to a generic page on error
    res.redirect(302, '/verify/error');
  }
};

// Handle credential submission on phishing page
export const handleCredentialSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, campaignId, userId } = req.body;

    if (!token || !campaignId || !userId) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
      return;
    }

    // Extract form data but DO NOT store actual credentials
    const formFields = Object.keys(req.body).filter(
      key => !['token', 'campaignId', 'userId'].includes(key)
    );

    const result = await recordCredentialsSubmitted(
      token,
      campaignId,
      userId,
      { fields: formFields }
    );

    if (result.success) {
      // Return success - frontend will show the "caught" page
      res.json({
        success: true,
        message: 'Submission recorded',
        redirect: '/verify/caught',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to record submission',
      });
    }
  } catch (error) {
    console.error('Credential submission tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Handle phishing report
export const handlePhishingReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, campaignId, userId, method } = req.body;

    if (!token || !campaignId || !userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
      });
      return;
    }

    const result = await recordPhishingReported(
      token,
      campaignId,
      userId,
      method || 'button'
    );

    res.json({
      success: true,
      message: 'Thank you for reporting this phishing attempt!',
      pointsEarned: 50,
    });
  } catch (error) {
    console.error('Phishing report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Get tracking pixel (for email open tracking)
export const handleTrackingPixel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { t: token, c: campaignId, u: userId } = req.query as {
      t: string;
      c: string;
      u: string;
    };

    // Record email open if parameters present
    if (token && campaignId && userId) {
      // This would update email opened status
      // For now, we're focused on SMS/voice
    }

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(pixel);
  } catch (error) {
    // Still return pixel on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
};

export default {
  handleLinkClick,
  handleCredentialSubmission,
  handlePhishingReport,
  handleTrackingPixel,
};
