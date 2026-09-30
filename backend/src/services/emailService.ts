import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
// import crypto from 'crypto'; // removed: unused

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    if (process.env.MOCK_EMAIL === 'true' || process.env.NODE_ENV === 'test') {
      transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
      });
    } else {
      const host = process.env.MAILTRAP_HOST || process.env.SMTP_HOST || process.env.SMTP_Host;
      const port = Number(
        process.env.MAILTRAP_PORT || process.env.SMTP_PORT || process.env.SMTP_Port || 2525
      );
      const user = process.env.MAILTRAP_USER || process.env.SMTP_USER;
      const pass = process.env.MAILTRAP_PASS || process.env.SMTP_PASS;

      if (host && user && pass) {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure: false,
          auth: {
            user,
            pass,
          },
        });
      } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 1025,
          secure: false,
        });
      }
    }
  }
  return transporter;
};

export const sendOtpEmail = async ({
  to,
  code,
  purpose,
}: {
  to: string;
  code: string;
  purpose: 'login_verification' | 'signup_verification';
}): Promise<void> => {
  if (process.env.MOCK_EMAIL === 'true' || process.env.NODE_ENV === 'test') {
    // Mock mode: OTP still goes into the sandbox/DB via createOtpRecord — no
    // need to also print it to the terminal.
    return;
  }

  const isSignup = purpose === 'signup_verification';
  const contextLine = isSignup
    ? 'Use this code to verify your email address and complete sign-up.'
    : 'Use this code to finish signing in.';

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'security@attackaware-demo.com',
    to,
    subject: 'Your AttackAware verification code',
    text: `Your verification code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-top: 0;">Your AttackAware verification code</h2>
        <p style="color: #374151;">${contextLine} It expires in <strong>5 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 6px; padding: 16px 24px; margin: 24px 0; text-align: center;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1d4ed8;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// Maps an email template key to the fake-login-page "brand" it should render as.
// These MUST match the keys in frontend/app/verify/[pageType]/page.tsx's pageConfigs.
const templatePageType: Record<string, string> = {
  bank_phishing: 'bank',
  office365_phishing: 'office365',
  hr_phishing: 'hr_benefits',
};

export const emailTemplates = {
  bank_phishing: {
    name: 'Bank Login Verification',
    subject: 'Urgent: Verify Your Bank Account - Security Alert',
    htmlTemplate: (trackingUrl: string, phishingPageUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="margin-bottom: 20px;">
            <img src="https://via.placeholder.com/200x50?text=Bank+Logo" alt="Bank" style="height: 50px;">
          </div>
          
          <h2 style="color: #d32f2f; margin: 20px 0;">Security Alert: Unusual Activity Detected</h2>
          
          <p style="color: #333; line-height: 1.6;">Dear Valued Customer,</p>
          
          <p style="color: #333; line-height: 1.6;">
            We have detected unusual login activity on your bank account. To protect your account, 
            we need you to verify your identity immediately.
          </p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong style="color: #856404;">Action Required:</strong>
            <p style="color: #856404; margin: 10px 0;">
              Please verify your account within the next 24 hours to avoid suspension.
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            <a href="${phishingPageUrl}" style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0;">
              Verify Your Account
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            If you did not attempt to access your account, please contact our support team immediately.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 11px;">
            This is a security notification. Please do not reply to this email.
            <img src="${trackingUrl}" alt="" style="width: 1px; height: 1px; display: none;">
          </p>
        </div>
      </div>
    `,
  },
  office365_phishing: {
    name: 'Office 365 Account Verification',
    subject: 'Action Required: Verify Your Microsoft 365 Account',
    htmlTemplate: (trackingUrl: string, phishingPageUrl: string) => `
      <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="margin-bottom: 20px;">
            <h1 style="color: #0078d4; margin: 0;">Microsoft 365</h1>
          </div>
          
          <h2 style="color: #333; font-size: 18px;">Action Required: Verify Your Account</h2>
          
          <p style="color: #333; line-height: 1.6; margin: 15px 0;">Hello,</p>
          
          <p style="color: #333; line-height: 1.6; margin: 15px 0;">
            Your Microsoft 365 account requires verification due to recent security updates. 
            Please verify your account to maintain access to your emails and files.
          </p>
          
          <div style="background-color: #e7f3ff; border-left: 4px solid #0078d4; padding: 15px; margin: 20px 0;">
            <p style="color: #003d82; margin: 0;">
              <strong>Verification Required:</strong> Your access will be restricted in 48 hours if not verified.
            </p>
          </div>
          
          <p style="color: #333; line-height: 1.6; text-align: center; margin: 30px 0;">
            <a href="${phishingPageUrl}" style="display: inline-block; background-color: #0078d4; color: white; padding: 12px 35px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
              Verify Account
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; line-height: 1.6;">
            If you did not make this request, your account may have been compromised. 
            Please change your password immediately.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="color: #999; font-size: 11px;">
            © 2026 Microsoft Corporation. All rights reserved.
            <img src="${trackingUrl}" alt="" style="width: 1px; height: 1px; display: none;">
          </p>
        </div>
      </div>
    `,
  },
  hr_phishing: {
    name: 'HR Benefits Update',
    subject: 'Urgent: Update Your HR Benefits Information',
    htmlTemplate: (trackingUrl: string, phishingPageUrl: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-top: 4px solid #2e7d32;">
          <h2 style="color: #2e7d32; margin-top: 0;">HR Benefits Enrollment - Action Required</h2>
          
          <p style="color: #333; line-height: 1.6;">Dear Employee,</p>
          
          <p style="color: #333; line-height: 1.6;">
            Your annual benefits enrollment period ends TODAY. Please complete your benefits selection 
            in the next 2 hours to ensure continuous coverage.
          </p>
          
          <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <strong style="color: #e65100;">Deadline: Today at 5:00 PM</strong>
            <p style="color: #e65100; margin: 10px 0;">
              Missing the deadline will result in automatic plan cancellation.
            </p>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${phishingPageUrl}" style="display: inline-block; background-color: #2e7d32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Complete Benefits Enrollment Now
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px;">
            Human Resources Department<br>
            <img src="${trackingUrl}" alt="" style="width: 1px; height: 1px; display: none;">
          </p>
        </div>
      </div>
    `,
  },
};

interface SendEmailOptions {
  to: string;
  templateKey?: keyof typeof emailTemplates;
  trackingToken: string;
  campaignId: string;
  userId: string;
  customSubject?: string;
  customHtml?: string;
}

export const sendPhishingEmail = async (options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  mocked?: boolean;
}> => {
  const templateKey = options.templateKey && emailTemplates[options.templateKey] ? options.templateKey : 'bank_phishing';
  const template = emailTemplates[templateKey];
  const trackingUrl = generateEmailTrackingUrl(
    options.trackingToken,
    options.campaignId,
    options.userId
  );
  const phishingPageUrl = generatePhishingPageUrl(
    options.trackingToken,
    templateKey,
    options.campaignId,
    options.userId
  );

  const subject = options.customSubject || template.subject;
  const rawHtml = options.customHtml || template.htmlTemplate(trackingUrl, phishingPageUrl);
  const htmlContent = rawHtml
    .replace(/\{\{phishingUrl\}\}/g, phishingPageUrl)
    .replace(/\{\{trackingUrl\}\}/g, trackingUrl);

  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (process.env.MOCK_EMAIL === 'true' || process.env.NODE_ENV === 'test') {
    const mockId = `MOCK_EM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Mock send is recorded in the DB by the caller (campaign/simulation
    // record) — no need to also print recipient, mock ID, or the phishing
    // link to the terminal.

    return { success: true, messageId: mockId, mocked: true };
  }

  // ── REAL EMAIL ─────────────────────────────────────────────────────────────
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'security@company.com',
      to: options.to,
      subject,
      html: htmlContent,
      headers: {
        'X-Campaign-ID': options.campaignId,
        'X-User-ID': options.userId,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    return { success: false, error: errorMessage };
  }
};

// ============================================
// GENERIC NOTIFICATION EMAIL (non-phishing) —
// used for account/company/subscription lifecycle notices
// ============================================
interface SendNotificationEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendNotificationEmail = async (
  options: SendNotificationEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string; mocked?: boolean }> => {
  if (process.env.MOCK_EMAIL === 'true' || process.env.NODE_ENV === 'test') {
    const mockId = `MOCK_EM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`\n[MOCK EMAIL] ══════════════════════════════════`);
    console.log(`  To      : ${options.to}`);
    console.log(`  Subject : ${options.subject}`);
    console.log(`  Mock ID : ${mockId}`);
    console.log(`════════════════════════════════════════════════\n`);
    return { success: true, messageId: mockId, mocked: true };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'security@company.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`[EMAIL SENT] To: ${options.to} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Notification email error:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const generateEmailTrackingUrl = (
  token: string,
  campaignId: string,
  userId: string
): string => {
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:5000/api/track';
  const params = new URLSearchParams({
    t: token,
    c: campaignId,
    u: userId,
    type: 'email',
  });
  return `${baseUrl}/pixel?${params.toString()}`;
};

// Landing page the employee sees after clicking "Verify Your Account" in the email.
// Includes campaignId + userId (not just the token) so the fake login page can
// report back which click/submission belongs to which simulation record.
export const generatePhishingPageUrl = (
  token: string,
  templateKey: keyof typeof emailTemplates,
  campaignId: string,
  userId: string
): string => {
  const baseUrl = process.env.PHISHING_PAGE_BASE_URL || 'http://localhost:3000/verify';
  const pageType = templatePageType[templateKey] || 'bank';
  const params = new URLSearchParams({ token, c: campaignId, u: userId });
  return `${baseUrl}/${pageType}?${params.toString()}`;
};

export const generateTrackingToken = (): string => {
  return uuidv4();
};