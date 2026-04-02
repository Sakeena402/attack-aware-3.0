import Twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Twilio client singleton
let twilioClient: Twilio.Twilio | null = null;

const getTwilioClient = (): Twilio.Twilio => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
};

// Generate unique tracking token
export const generateTrackingToken = (): string => {
  return uuidv4();
};

// Hash token for secure storage
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate tracking URL with token
export const generateTrackingUrl = (
  token: string,
  campaignId: string,
  userId: string,
  pageType: string = 'bank'
): string => {
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000/api/track';
  const params = new URLSearchParams({
    t: token,
    c: campaignId,
    u: userId,
    p: pageType,
  });
  return `${baseUrl}/click?${params.toString()}`;
};

// Generate phishing page URL
export const generatePhishingPageUrl = (
  token: string,
  pageType: string = 'bank'
): string => {
  const baseUrl = process.env.PHISHING_PAGE_BASE_URL || 'http://localhost:3000/verify';
  return `${baseUrl}/${pageType}?token=${token}`;
};

// SMS Templates for different scenarios
export const smsTemplates = {
  bank_alert: {
    name: 'Bank Security Alert',
    message: (url: string) => 
      `[Security Alert] Unusual activity detected on your account. Verify your identity immediately to prevent suspension: ${url}`,
  },
  package_delivery: {
    name: 'Package Delivery',
    message: (url: string) => 
      `Your package delivery is pending. Please confirm your address to avoid return: ${url}`,
  },
  hr_benefits: {
    name: 'HR Benefits Update',
    message: (url: string) => 
      `[HR Notice] Your benefits enrollment expires today. Update your information now: ${url}`,
  },
  password_reset: {
    name: 'Password Reset Request',
    message: (url: string) => 
      `A password reset was requested for your account. If this wasn't you, secure your account: ${url}`,
  },
  prize_winner: {
    name: 'Prize Winner',
    message: (url: string) => 
      `Congratulations! You've won a $500 gift card. Claim now before it expires: ${url}`,
  },
  tax_refund: {
    name: 'Tax Refund',
    message: (url: string) => 
      `[IRS Notice] Your tax refund of $1,247.00 is ready. Verify your details to receive: ${url}`,
  },
};

// Voice call scripts for vishing
export const voiceScripts = {
  bank_verification: {
    name: 'Bank Account Verification',
    twiml: (pressKey: string = '1') => `
      <Response>
        <Say voice="alice">
          This is an important security call from your financial institution.
          We have detected suspicious activity on your account.
          Press ${pressKey} to speak with a security representative.
          Press 2 to verify your account details.
          Press 9 to report this as a suspicious call.
        </Say>
        <Gather numDigits="1" action="/api/webhooks/twilio/voice-response" method="POST">
          <Say voice="alice">Please make your selection now.</Say>
        </Gather>
        <Say voice="alice">We did not receive your response. Goodbye.</Say>
      </Response>
    `,
  },
  it_support: {
    name: 'IT Support Call',
    twiml: (pressKey: string = '1') => `
      <Response>
        <Say voice="alice">
          Hello, this is your company's IT support department.
          We have detected a security issue with your work computer.
          Press ${pressKey} to connect with a technician immediately.
          Press 2 to schedule a callback.
          Press 9 to report this as a suspicious call.
        </Say>
        <Gather numDigits="1" action="/api/webhooks/twilio/voice-response" method="POST">
          <Say voice="alice">Please make your selection now.</Say>
        </Gather>
        <Say voice="alice">We did not receive your response. Goodbye.</Say>
      </Response>
    `,
  },
  insurance_claim: {
    name: 'Insurance Claim',
    twiml: (pressKey: string = '1') => `
      <Response>
        <Say voice="alice">
          This call is regarding an important update to your insurance policy.
          Your coverage may be affected if you do not respond.
          Press ${pressKey} to speak with an agent about your policy.
          Press 2 to confirm your current coverage.
          Press 9 to report this as a suspicious call.
        </Say>
        <Gather numDigits="1" action="/api/webhooks/twilio/voice-response" method="POST">
          <Say voice="alice">Please make your selection now.</Say>
        </Gather>
        <Say voice="alice">We did not receive your response. Goodbye.</Say>
      </Response>
    `,
  },
};

// Send SMS
interface SendSmsOptions {
  to: string;
  templateKey: keyof typeof smsTemplates;
  trackingToken: string;
  campaignId: string;
  userId: string;
  customMessage?: string;
}

export const sendSms = async (options: SendSmsOptions): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> => {
  try {
    const client = getTwilioClient();
    const template = smsTemplates[options.templateKey];
    
    const trackingUrl = generateTrackingUrl(
      options.trackingToken,
      options.campaignId,
      options.userId,
      options.templateKey
    );

    const messageBody = options.customMessage || template.message(trackingUrl);

    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
      statusCallback: `${process.env.API_URL}/api/webhooks/twilio/sms-status`,
    });

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS';
    console.error('Twilio SMS Error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Make voice call
interface MakeCallOptions {
  to: string;
  scriptKey: keyof typeof voiceScripts;
  trackingToken: string;
  campaignId: string;
  userId: string;
}

export const makeVoiceCall = async (options: MakeCallOptions): Promise<{
  success: boolean;
  callSid?: string;
  error?: string;
}> => {
  try {
    const client = getTwilioClient();
    const script = voiceScripts[options.scriptKey];

    const call = await client.calls.create({
      twiml: script.twiml(),
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: options.to,
      statusCallback: `${process.env.API_URL}/api/webhooks/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'Enable',
    });

    return {
      success: true,
      callSid: call.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to make call';
    console.error('Twilio Voice Error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Verify Twilio webhook signature
export const verifyTwilioSignature = (
  signature: string,
  url: string,
  params: Record<string, string>
): boolean => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  return Twilio.validateRequest(authToken, signature, url, params);
};

// Get SMS delivery status description
export const getSmsStatusDescription = (status: string): string => {
  const statusMap: Record<string, string> = {
    queued: 'Message is queued for delivery',
    sending: 'Message is being sent',
    sent: 'Message has been sent',
    delivered: 'Message was delivered',
    undelivered: 'Message could not be delivered',
    failed: 'Message failed to send',
  };
  return statusMap[status] || 'Unknown status';
};

// Get call status description
export const getCallStatusDescription = (status: string): string => {
  const statusMap: Record<string, string> = {
    queued: 'Call is queued',
    ringing: 'Phone is ringing',
    'in-progress': 'Call is in progress',
    completed: 'Call completed',
    busy: 'Line was busy',
    failed: 'Call failed',
    'no-answer': 'No answer',
    canceled: 'Call was canceled',
  };
  return statusMap[status] || 'Unknown status';
};

export default {
  generateTrackingToken,
  hashToken,
  generateTrackingUrl,
  generatePhishingPageUrl,
  smsTemplates,
  voiceScripts,
  sendSms,
  makeVoiceCall,
  verifyTwilioSignature,
  getSmsStatusDescription,
  getCallStatusDescription,
};
