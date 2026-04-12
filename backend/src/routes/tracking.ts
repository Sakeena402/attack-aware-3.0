/*import { Router } from 'express';
import {
  handleLinkClick,
  handleCredentialSubmission,
  handlePhishingReport,
  handleTrackingPixel,
} from '../controllers/trackingController.js';

const trackingRouter = Router();

// SMS link click tracking (redirects to phishing page)
trackingRouter.get('/click', handleLinkClick);

// Credential submission from phishing page
trackingRouter.post('/submit', handleCredentialSubmission);

// Report phishing attempt
trackingRouter.post('/report', handlePhishingReport);

// Email tracking pixel
trackingRouter.get('/pixel', handleTrackingPixel);

export default trackingRouter;
*/
//hifza code
import { Router, Request, Response } from 'express';
import { recordSmsClick } from '../services/trackingService.js';

const trackingRouter = Router();

trackingRouter.get('/click', async (req: Request, res: Response) => {
  const awarenessUrl = process.env.AWARENESS_PAGE_URL || 'http://localhost:3000/awareness';

  try {
    const { t: token, c: campaignId, u: userId } = req.query as Record<string, string>;

    if (!token || !campaignId || !userId) {
      return res.redirect(302, awarenessUrl);
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await recordSmsClick(token, campaignId, userId, ipAddress, userAgent);

    if (!result.success) {
      console.warn(`[TRACK] Token not found in DB. campaignId=${campaignId} userId=${userId}`);
    } else if (result.alreadyClicked) {
      console.info(`[TRACK] Duplicate click ignored. campaignId=${campaignId} userId=${userId}`);
    } else {
      console.info(`[TRACK] Click recorded. campaignId=${campaignId} userId=${userId}`);
    }

    return res.redirect(302, awarenessUrl);

  } catch (error) {
    console.error('[TRACK] Unexpected error recording click:', error);
    return res.redirect(302, awarenessUrl);
  }
});

export default trackingRouter;
