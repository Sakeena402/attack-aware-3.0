import { Router, Request, Response } from 'express';
import {
  recordSmsClick,
  recordEmailClick,
  recordEmailOpened,
  recordCredentialsSubmitted,
  recordPhishingReported,
} from '../services/trackingService.js';

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

// Called by the fake landing page when the employee submits the login form.
// The frontend sends the actual typed values (...formValues) so the fake
// page can look and feel real — but we NEVER persist those values. We only
// record which field NAMES were filled in (e.g. ["accountNumber", "password"]).
// The real value strings are discarded the instant this handler reads them.
trackingRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    const { token, campaignId, userId, ...rest } = req.body as {
      token?: string;
      campaignId?: string;
      userId?: string;
      [key: string]: unknown;
    };

    if (!token || !campaignId || !userId) {
      res.status(400).json({ success: false, error: 'Missing tracking parameters' });
      return;
    }

    // Only keep the KEYS of the submitted fields — never the values.
    const fieldNames = Object.keys(rest).filter((key) => rest[key] !== undefined && rest[key] !== '');

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await recordCredentialsSubmitted(
      token,
      campaignId,
      userId,
      fieldNames,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      console.warn(`[TRACK] Submit: token not found. campaignId=${campaignId} userId=${userId}`);
      res.status(404).json({ success: false, error: 'Simulation record not found' });
      return;
    }

    if (result.alreadySubmitted) {
      console.info(`[TRACK] Credentials already submitted. campaignId=${campaignId} userId=${userId}`);
    } else {
      console.info(`[TRACK] Credentials submitted. campaignId=${campaignId} userId=${userId} fields=${fieldNames.join(',')}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[TRACK] Error recording submission:', error);
    res.status(500).json({ success: false, error: 'Failed to record submission' });
  }
});

// Called when the employee taps "Report as suspicious" on the fake landing page.
trackingRouter.post('/report', async (req: Request, res: Response) => {
  try {
    const { token, campaignId, userId } = req.body as {
      token?: string;
      campaignId?: string;
      userId?: string;
    };

    if (!token || !campaignId || !userId) {
      res.status(400).json({ success: false, error: 'Missing tracking parameters' });
      return;
    }

    const result = await recordPhishingReported(token, campaignId, userId, 'landing_page_report_button');

    if (!result.success) {
      console.warn(`[TRACK] Report: token not found. campaignId=${campaignId} userId=${userId}`);
      res.status(404).json({ success: false, error: 'Simulation record not found' });
      return;
    }

    console.info(`[TRACK] Phishing reported. campaignId=${campaignId} userId=${userId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[TRACK] Error recording report:', error);
    res.status(500).json({ success: false, error: 'Failed to record report' });
  }
});

export default trackingRouter;