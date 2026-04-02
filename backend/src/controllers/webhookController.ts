import { Request, Response } from 'express';
import { verifyTwilioSignature, voiceScripts } from '../services/twilioService.js';
import {
  recordSmsStatus,
  recordCallStatus,
  recordVoiceResponse,
} from '../services/trackingService.js';
import SimulationResult from '../models/SimulationResult.js';

// Middleware to verify Twilio signature
export const verifyTwilioWebhook = (
  req: Request,
  res: Response,
  next: () => void
): void => {
  const signature = req.headers['x-twilio-signature'] as string;
  const url = `${process.env.API_URL}${req.originalUrl}`;

  // Skip verification in development
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  if (!signature || !verifyTwilioSignature(signature, url, req.body)) {
    res.status(403).json({ error: 'Invalid Twilio signature' });
    return;
  }

  next();
};

// Handle SMS delivery status updates
export const handleSmsStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    } = req.body;

    await recordSmsStatus({
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
    });

    // Twilio expects a 200 response
    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('SMS status webhook error:', error);
    res.status(200).send('<Response></Response>');
  }
};

// Handle voice call status updates
export const handleCallStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      AnsweredBy,
    } = req.body;

    await recordCallStatus({
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration ? parseInt(CallDuration, 10) : undefined,
      answeredBy: AnsweredBy,
    });

    res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Call status webhook error:', error);
    res.status(200).send('<Response></Response>');
  }
};

// Handle voice call response (keypress)
export const handleVoiceResponse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { CallSid, Digits } = req.body;

    // Find the simulation result to get campaign/user info
    const result = await SimulationResult.findOne({ callSid: CallSid });

    if (result) {
      const { responseType } = await recordVoiceResponse({
        callSid: CallSid,
        digitsPressed: Digits,
        campaignId: result.campaignId.toString(),
        userId: result.userId.toString(),
      });

      // Generate appropriate TwiML response based on what they pressed
      let twimlResponse = '';

      switch (Digits) {
        case '1':
          twimlResponse = `
            <Response>
              <Say voice="alice">
                Thank you for your response. This was a security awareness test.
                You pressed 1 to speak with a representative. In a real attack,
                this could lead to social engineering. Please be cautious of unexpected calls
                asking you to verify sensitive information.
              </Say>
              <Hangup/>
            </Response>
          `;
          break;
        case '2':
          twimlResponse = `
            <Response>
              <Say voice="alice">
                Thank you for your response. This was a security awareness test.
                You pressed 2 to verify your details. In a real attack,
                this could lead to identity theft. Never provide personal information
                to unsolicited callers.
              </Say>
              <Hangup/>
            </Response>
          `;
          break;
        case '9':
          twimlResponse = `
            <Response>
              <Say voice="alice">
                Excellent choice! This was a security awareness test, and you correctly
                identified it as suspicious. You have earned security awareness points.
                Keep up the good work protecting yourself and your organization!
              </Say>
              <Hangup/>
            </Response>
          `;
          break;
        default:
          twimlResponse = `
            <Response>
              <Say voice="alice">
                This was a security awareness test. Thank you for participating.
                Remember to be cautious of unexpected calls asking for personal information.
              </Say>
              <Hangup/>
            </Response>
          `;
      }

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twimlResponse);
    } else {
      res.set('Content-Type', 'text/xml');
      res.status(200).send('<Response><Hangup/></Response>');
    }
  } catch (error) {
    console.error('Voice response webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response><Hangup/></Response>');
  }
};

// Initial voice call TwiML (when call is first answered)
export const handleVoiceInitial = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { CallSid } = req.body;

    // Find the simulation to get the script type
    const result = await SimulationResult.findOne({ callSid: CallSid });

    let twiml = '';

    if (result && result.voiceScript) {
      const scriptKey = result.voiceScript as keyof typeof voiceScripts;
      const script = voiceScripts[scriptKey];
      if (script) {
        twiml = script.twiml();
      }
    }

    // Default script if none found
    if (!twiml) {
      twiml = voiceScripts.bank_verification.twiml();
    }

    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);
  } catch (error) {
    console.error('Voice initial webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response><Hangup/></Response>');
  }
};

export default {
  verifyTwilioWebhook,
  handleSmsStatus,
  handleCallStatus,
  handleVoiceResponse,
  handleVoiceInitial,
};
