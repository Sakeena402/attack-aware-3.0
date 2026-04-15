
// //hifza code
// import { Router, Request, Response } from 'express';
// import { recordSmsClick } from '../services/trackingService.js';

// const trackingRouter = Router();

// trackingRouter.get('/click', async (req: Request, res: Response) => {
//   const awarenessUrl = process.env.AWARENESS_PAGE_URL || 'http://localhost:3000/awareness';

//   try {
//     const { t: token, c: campaignId, u: userId } = req.query as Record<string, string>;

//     if (!token || !campaignId || !userId) {
//       return res.redirect(302, awarenessUrl);
//     }

//     const ipAddress =
//       (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
//     const userAgent = req.headers['user-agent'] || '';

//     const result = await recordSmsClick(token, campaignId, userId, ipAddress, userAgent);

//     if (!result.success) {
//       console.warn(`[TRACK] Token not found in DB. campaignId=${campaignId} userId=${userId}`);
//     } else if (result.alreadyClicked) {
//       console.info(`[TRACK] Duplicate click ignored. campaignId=${campaignId} userId=${userId}`);
//     } else {
//       console.info(`[TRACK] Click recorded. campaignId=${campaignId} userId=${userId}`);
//     }

//     return res.redirect(302, awarenessUrl);

//   } catch (error) {
//     console.error('[TRACK] Unexpected error recording click:', error);
//     return res.redirect(302, awarenessUrl);
//   }
// });

// export default trackingRouter;


// //new code 2.0 for mock 
// // backend/src/routes/tracking.ts
// import { Router, Request, Response } from 'express';
// import { recordSmsClick, recordCredentialsSubmitted, recordPhishingReported } from '../services/trackingService.js';
// import { generatePhishingPageUrl } from '../services/twilioService.js';

// const trackingRouter = Router();

// // ─── CLICK TRACKING ──────────────────────────────────────────────────────────
// // This is the URL inside the SMS. Employee clicks it, we record it, redirect to
// // the fake verify page.
// trackingRouter.get('/click', async (req: Request, res: Response) => {
//   const { t: token, c: campaignId, u: userId, p: pageType } = req.query as Record<string, string>;

//   console.log(`\n[TRACK CLICK] ──────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);
//   console.log(`  pageType   : ${pageType || 'bank'}`);

//   // Always redirect to phishing page regardless — maintains simulation experience
//   const phishingUrl = generatePhishingPageUrl(token, pageType || 'bank');

//   if (!token || !campaignId || !userId) {
//     console.warn(`[TRACK CLICK] Missing params — redirecting to phishing page anyway`);
//     return res.redirect(302, phishingUrl);
//   }

//   try {
//     const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
//     const userAgent = req.headers['user-agent'] || '';

//     const result = await recordSmsClick(token, campaignId, userId, ipAddress, userAgent);

//     if (!result.success) {
//       console.warn(`[TRACK CLICK] ⚠ Token not found in DB — click NOT recorded`);
//       console.warn(`  Possible cause: launchCampaign did not save SimulationResult`);
//     } else if (result.alreadyClicked) {
//       console.info(`[TRACK CLICK] ℹ Duplicate click ignored`);
//     } else {
//       console.info(`[TRACK CLICK] ✓ Click recorded successfully`);
//     }

//     console.log(`[TRACK CLICK] Redirecting to: ${phishingUrl}`);
//     console.log(`──────────────────────────────────────────\n`);
//     return res.redirect(302, phishingUrl);

//   } catch (error) {
//     console.error('[TRACK CLICK] Unexpected error:', error);
//     return res.redirect(302, phishingUrl);
//   }
// });

// // ─── CREDENTIAL SUBMISSION ───────────────────────────────────────────────────
// // Called when employee submits the fake login form on the verify page.
// // POST body: { token, campaignId, userId, ...formFields }
// trackingRouter.post('/submit', async (req: Request, res: Response) => {
//   const { token, campaignId, userId, ...formData } = req.body;

//   console.log(`\n[TRACK SUBMIT] ─────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);
//   console.log(`  fields     : ${Object.keys(formData).join(', ')}`);
//   console.log(`  ⚠  Actual values NOT logged for privacy`);

//   if (!token || !campaignId || !userId) {
//     return res.status(400).json({ success: false, error: 'Missing required parameters' });
//   }

//   try {
//     // We only store FIELD NAMES, never actual values
//     const result = await recordCredentialsSubmitted(token, campaignId, userId, formData);

//     if (result.success) {
//       console.info(`[TRACK SUBMIT] ✓ Credential submission recorded`);
//       console.log(`──────────────────────────────────────────\n`);
//       return res.json({
//         success: true,
//         message: 'Recorded',
//         redirect: '/verify/caught',
//       });
//     } else {
//       console.warn(`[TRACK SUBMIT] ⚠ Could not find SimulationResult for this token`);
//       return res.status(400).json({ success: false, error: 'Record not found' });
//     }
//   } catch (error) {
//     console.error('[TRACK SUBMIT] Error:', error);
//     return res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // ─── PHISHING REPORT ─────────────────────────────────────────────────────────
// // Called when employee clicks "Report this as phishing" button.
// trackingRouter.post('/report', async (req: Request, res: Response) => {
//   const { token, campaignId, userId } = req.body;

//   console.log(`\n[TRACK REPORT] ─────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);

//   if (!token || !campaignId || !userId) {
//     return res.status(400).json({ success: false, error: 'Missing required parameters' });
//   }

//   try {
//     await recordPhishingReported(token, campaignId, userId, 'button');
//     console.info(`[TRACK REPORT] ✓ Report recorded — user earned 50 points`);
//     console.log(`──────────────────────────────────────────\n`);
//     return res.json({ success: true, pointsEarned: 50 });
//   } catch (error) {
//     console.error('[TRACK REPORT] Error:', error);
//     return res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// export default trackingRouter;



// backend/src/routes/tracking.ts
import { Router, Request, Response } from 'express';
import {
  recordSmsClick,
  recordCredentialsSubmitted,
  recordPhishingReported,
} from '../services/trackingService.js';
import { generatePhishingPageUrl } from '../services/twilioService.js';

const trackingRouter = Router();

// ── CLICK TRACKING ────────────────────────────────────────────────────────────
trackingRouter.get('/click', async (req: Request, res: Response) => {
  const {
    t: token,
    c: campaignId,
    u: userId,
    p: pageType,
  } = req.query as Record<string, string>;

  console.log(`\n[TRACK CLICK] ──────────────────────────────`);
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);
  console.log(`  pageType   : ${pageType || 'bank'}`);

  // Always redirect — pass campaignId and userId through so verify page has them
  const phishingUrl = generatePhishingPageUrl(
    token,
    pageType || 'bank',
    campaignId,
    userId
  );

  if (!token || !campaignId || !userId) {
    console.warn(`[TRACK CLICK] ⚠ Missing params`);
    return res.redirect(302, phishingUrl);
  }

  try {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await recordSmsClick(
      token,
      campaignId,
      userId,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      console.warn(`[TRACK CLICK] ⚠ Token not found in DB — click NOT recorded`);
    } else if (result.alreadyClicked) {
      console.info(`[TRACK CLICK] ℹ Duplicate click ignored`);
    } else {
      console.info(`[TRACK CLICK] ✓ Click recorded successfully`);
    }

    console.log(`[TRACK CLICK] Redirecting → ${phishingUrl}`);
    console.log(`──────────────────────────────────────────\n`);
    return res.redirect(302, phishingUrl);
  } catch (error) {
    console.error('[TRACK CLICK] Error:', error);
    return res.redirect(302, phishingUrl);
  }
});

// ── CREDENTIAL SUBMISSION ─────────────────────────────────────────────────────
trackingRouter.post('/submit', async (req: Request, res: Response) => {
  const { token, campaignId, userId, ...formData } = req.body;

  console.log(`\n[TRACK SUBMIT] ─────────────────────────────`);
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);
  console.log(`  fields     : ${Object.keys(formData).join(', ')}`);
  console.log(`  ⚠  Actual values NOT logged for privacy`);

  if (!token || !campaignId || !userId) {
    console.warn(`[TRACK SUBMIT] ⚠ Missing token/campaignId/userId`);
    return res.status(400).json({
      success: false,
      error: 'Missing required tracking parameters',
    });
  }

  try {
    const result = await recordCredentialsSubmitted(
      token,
      campaignId,
      userId,
      formData
    );

    if (result.success) {
      console.info(`[TRACK SUBMIT] ✓ Credential submission recorded`);
      console.log(`──────────────────────────────────────────\n`);
      return res.json({
        success: true,
        message: 'Recorded',
        redirect: '/verify/caught',
      });
    } else {
      console.warn(`[TRACK SUBMIT] ⚠ SimulationResult not found for this token`);
      // Still return success so employee sees the caught page
      return res.json({
        success: true,
        message: 'Recorded',
        redirect: '/verify/caught',
      });
    }
  } catch (error) {
    console.error('[TRACK SUBMIT] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PHISHING REPORT ───────────────────────────────────────────────────────────
trackingRouter.post('/report', async (req: Request, res: Response) => {
  const { token, campaignId, userId } = req.body;

  console.log(`\n[TRACK REPORT] ─────────────────────────────`);
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);

  if (!token || !campaignId || !userId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing required parameters' });
  }

  try {
    await recordPhishingReported(token, campaignId, userId, 'button');
    console.info(`[TRACK REPORT] ✓ Report recorded — user earned 50 points`);
    console.log(`──────────────────────────────────────────\n`);
    return res.json({ success: true, pointsEarned: 50 });
  } catch (error) {
    console.error('[TRACK REPORT] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default trackingRouter;