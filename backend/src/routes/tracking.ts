

// // backend/src/routes/tracking.ts
// import { Router, Request, Response } from 'express';
// import {
//   recordSmsClick,
//   recordCredentialsSubmitted,
//   recordPhishingReported,
// } from '../services/trackingService.js';
// import { generatePhishingPageUrl } from '../services/twilioService.js';

// const trackingRouter = Router();

// // ── CLICK TRACKING ────────────────────────────────────────────────────────────
// trackingRouter.get('/click', async (req: Request, res: Response) => {
//   const {
//     t: token,
//     c: campaignId,
//     u: userId,
//     p: pageType,
//   } = req.query as Record<string, string>;

//   console.log(`\n[TRACK CLICK] ──────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);
//   console.log(`  pageType   : ${pageType || 'bank'}`);

//   // Always redirect — pass campaignId and userId through so verify page has them
//   const phishingUrl = generatePhishingPageUrl(
//     token,
//     pageType || 'bank',
//     campaignId,
//     userId
//   );

//   if (!token || !campaignId || !userId) {
//     console.warn(`[TRACK CLICK] ⚠ Missing params`);
//     return res.redirect(302, phishingUrl);
//   }

//   try {
//     const ipAddress =
//       (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
//       req.ip ||
//       '';
//     const userAgent = req.headers['user-agent'] || '';

//     const result = await recordSmsClick(
//       token,
//       campaignId,
//       userId,
//       ipAddress,
//       userAgent
//     );

//     if (!result.success) {
//       console.warn(`[TRACK CLICK] ⚠ Token not found in DB — click NOT recorded`);
//     } else if (result.alreadyClicked) {
//       console.info(`[TRACK CLICK] ℹ Duplicate click ignored`);
//     } else {
//       console.info(`[TRACK CLICK] ✓ Click recorded successfully`);
//     }

//     console.log(`[TRACK CLICK] Redirecting → ${phishingUrl}`);
//     console.log(`──────────────────────────────────────────\n`);
//     return res.redirect(302, phishingUrl);
//   } catch (error) {
//     console.error('[TRACK CLICK] Error:', error);
//     return res.redirect(302, phishingUrl);
//   }
// });

// // ── CREDENTIAL SUBMISSION ─────────────────────────────────────────────────────
// trackingRouter.post('/submit', async (req: Request, res: Response) => {
//   const { token, campaignId, userId, ...formData } = req.body;

//   console.log(`\n[TRACK SUBMIT] ─────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);
//   console.log(`  fields     : ${Object.keys(formData).join(', ')}`);
//   console.log(`  ⚠  Actual values NOT logged for privacy`);

//   if (!token || !campaignId || !userId) {
//     console.warn(`[TRACK SUBMIT] ⚠ Missing token/campaignId/userId`);
//     return res.status(400).json({
//       success: false,
//       error: 'Missing required tracking parameters',
//     });
//   }

//   try {
//     const result = await recordCredentialsSubmitted(
//       token,
//       campaignId,
//       userId,
//       formData
//     );

//     if (result.success) {
//       console.info(`[TRACK SUBMIT] ✓ Credential submission recorded`);
//       console.log(`──────────────────────────────────────────\n`);
//       return res.json({
//         success: true,
//         message: 'Recorded',
//         redirect: '/verify/caught',
//       });
//     } else {
//       console.warn(`[TRACK SUBMIT] ⚠ SimulationResult not found for this token`);
//       // Still return success so employee sees the caught page
//       return res.json({
//         success: true,
//         message: 'Recorded',
//         redirect: '/verify/caught',
//       });
//     }
//   } catch (error) {
//     console.error('[TRACK SUBMIT] Error:', error);
//     return res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // ── PHISHING REPORT ───────────────────────────────────────────────────────────
// trackingRouter.post('/report', async (req: Request, res: Response) => {
//   const { token, campaignId, userId } = req.body;

//   console.log(`\n[TRACK REPORT] ─────────────────────────────`);
//   console.log(`  token      : ${token}`);
//   console.log(`  campaignId : ${campaignId}`);
//   console.log(`  userId     : ${userId}`);

//   if (!token || !campaignId || !userId) {
//     return res
//       .status(400)
//       .json({ success: false, error: 'Missing required parameters' });
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/track/click
//
// Receives: ?t=RAW_UUID&c=CAMPAIGN_ID&u=USER_ID&p=PAGE_TYPE
// Records the click then redirects to the phishing simulation page.
// The redirect URL carries token+campaignId+userId so the verify page
// can send them back on form submit.
// ─────────────────────────────────────────────────────────────────────────────
trackingRouter.get('/click', async (req: Request, res: Response) => {
  const {
    t: token,
    c: campaignId,
    u: userId,
    p: pageType,
  } = req.query as Record<string, string>;

  console.log('\n[TRACK CLICK] ──────────────────────────────');
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);
  console.log(`  pageType   : ${pageType || 'bank'}`);

  // Build redirect URL — ALWAYS include all four params so verify page has them
  const phishingUrl = generatePhishingPageUrl(
    token      || '',
    pageType   || 'bank',
    campaignId || '',
    userId     || ''
  );

  if (!token || !campaignId || !userId) {
    console.warn('[TRACK CLICK] ⚠ Missing params — redirecting without recording');
    return res.redirect(302, phishingUrl);
  }

  try {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await recordSmsClick(token, campaignId, userId, ipAddress, userAgent);

    if (!result.success)          console.warn('[TRACK CLICK] ⚠ Token not found in DB');
    else if (result.alreadyClicked) console.info('[TRACK CLICK] ℹ Duplicate click — skipped');
    else                            console.info('[TRACK CLICK] ✓ Click recorded');
  } catch (err) {
    // Never let tracking failure block the redirect
    console.error('[TRACK CLICK] Error:', err);
  }

  console.log(`[TRACK CLICK] → ${phishingUrl}\n`);
  return res.redirect(302, phishingUrl);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/track/submit
//
// Called when employee submits credentials on the phishing sim page.
// Body MUST contain: { token, campaignId, userId, ...formFields }
//
// IMPORTANT NOTE FOR FRONTEND:
// The verify page URL is: /verify/bank?token=X&c=CAMPAIGN_ID&u=USER_ID
// When POSTing to this endpoint, read query params as:
//   token      = searchParams.get('token')
//   campaignId = searchParams.get('c')
//   userId     = searchParams.get('u')
// Then include them in the POST body.
// ─────────────────────────────────────────────────────────────────────────────
trackingRouter.post('/submit', async (req: Request, res: Response) => {
  const { token, campaignId, userId, ...formData } = req.body;

  console.log('\n[TRACK SUBMIT] ─────────────────────────────');
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);
  console.log(`  fields     : ${Object.keys(formData).join(', ')}`);
  console.log('  ⚠  Actual values NOT logged for privacy');

  if (!token || !campaignId || !userId) {
    console.warn('[TRACK SUBMIT] ⚠ Missing token/campaignId/userId in request body');
    // Still return 200 so employee sees the caught page
    // (missing params is a frontend config issue, not a user error)
    return res.json({
      success:  true,
      message:  'Recorded',
      redirect: '/verify/caught',
    });
  }

  try {
    await recordCredentialsSubmitted(token, campaignId, userId, formData);
    console.info('[TRACK SUBMIT] ✓ Credential submission recorded in DB');
    console.log('──────────────────────────────────────────\n');

    return res.json({
      success:  true,
      message:  'Recorded',
      redirect: '/verify/caught',
    });
  } catch (err) {
    console.error('[TRACK SUBMIT] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/track/report
//
// Called when employee clicks "Report as Phishing" on the sim page.
// Body MUST contain: { token, campaignId, userId }
// ─────────────────────────────────────────────────────────────────────────────
trackingRouter.post('/report', async (req: Request, res: Response) => {
  const { token, campaignId, userId } = req.body;

  console.log('\n[TRACK REPORT] ─────────────────────────────');
  console.log(`  token      : ${token}`);
  console.log(`  campaignId : ${campaignId}`);
  console.log(`  userId     : ${userId}`);

  if (!token || !campaignId || !userId) {
    console.warn('[TRACK REPORT] ⚠ Missing params');
    return res.status(400).json({
      success: false,
      error:   'Missing required parameters',
    });
  }

  try {
    await recordPhishingReported(token, campaignId, userId, 'button');
    console.info('[TRACK REPORT] ✓ Report recorded in DB');
    console.log('──────────────────────────────────────────\n');

    return res.json({ success: true, pointsEarned: 10 });
  } catch (err) {
    console.error('[TRACK REPORT] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/track/pixel — 1×1 transparent GIF for email open tracking
// ─────────────────────────────────────────────────────────────────────────────
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

trackingRouter.get('/pixel', async (req: Request, res: Response) => {
  res.set('Content-Type',  'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(TRACKING_PIXEL);

  const { t: token, c: campaignId, u: userId } = req.query as Record<string, string>;
  if (token && campaignId && userId) {
    console.log(`[TRACK PIXEL] email open — campaign=${campaignId} user=${userId}`);
    // Future: recordEmailOpened(token, campaignId, userId)
  }
});

export default trackingRouter;