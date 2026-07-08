import { Router, Request, Response } from 'express';
import { recordSmsClick, recordEmailClick, recordEmailOpened } from '../services/trackingService.js';

const trackingRouter = Router();

trackingRouter.get('/click', async (req: Request, res: Response) => {
  const awarenessUrl = process.env.AWARENESS_PAGE_URL || 'http://localhost:3000/awareness';

  try {
    const { t: token, c: campaignId, u: userId, type } = req.query as Record<string, string>;

    if (!token || !campaignId || !userId) {
      return res.redirect(302, awarenessUrl);
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    if (type === 'email') {
      const result = await recordEmailClick(token, campaignId, userId, ipAddress, userAgent);
      if (!result.success) {
        console.warn(`[TRACK] Email token not found. campaignId=${campaignId} userId=${userId}`);
      } else if (result.alreadyClicked) {
        console.info(`[TRACK] Email already clicked. campaignId=${campaignId} userId=${userId}`);
      } else {
        console.info(`[TRACK] Email click recorded. campaignId=${campaignId} userId=${userId}`);
      }
    } else {
      const result = await recordSmsClick(token, campaignId, userId, ipAddress, userAgent);
      if (!result.success) {
        console.warn(`[TRACK] SMS token not found. campaignId=${campaignId} userId=${userId}`);
      } else if (result.alreadyClicked) {
        console.info(`[TRACK] SMS already clicked. campaignId=${campaignId} userId=${userId}`);
      } else {
        console.info(`[TRACK] SMS click recorded. campaignId=${campaignId} userId=${userId}`);
      }
    }

    return res.redirect(302, awarenessUrl);

  } catch (error) {
    console.error('[TRACK] Error recording click:', error);
    const awarenessUrl = process.env.AWARENESS_PAGE_URL || 'http://localhost:3000/awareness';
    return res.redirect(302, awarenessUrl);
  }
});

trackingRouter.get('/pixel', async (req: Request, res: Response) => {
  try {
    const { t: token, c: campaignId, u: userId } = req.query as Record<string, string>;

    if (token && campaignId && userId) {
      await recordEmailOpened(token);
      console.info(`[TRACK] Email opened. campaignId=${campaignId} userId=${userId}`);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('[TRACK] Pixel tracking error:', error);
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

export default trackingRouter;