import { Router } from 'express';
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
