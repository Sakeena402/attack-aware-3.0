import { Router } from 'express';
import {
  handleSmsStatus,
  handleCallStatus,
  handleVoiceResponse,
  handleVoiceInitial,
  verifyTwilioWebhook,
} from '../controllers/webhookController.js';

const webhooksRouter = Router();

// Twilio SMS status callback
webhooksRouter.post('/twilio/sms-status', verifyTwilioWebhook, handleSmsStatus);

// Twilio call status callback
webhooksRouter.post('/twilio/call-status', verifyTwilioWebhook, handleCallStatus);

// Twilio voice response (keypress) callback
webhooksRouter.post('/twilio/voice-response', verifyTwilioWebhook, handleVoiceResponse);

// Twilio initial voice TwiML
webhooksRouter.post('/twilio/voice-initial', verifyTwilioWebhook, handleVoiceInitial);

export default webhooksRouter;
