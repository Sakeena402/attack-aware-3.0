// backend/src/lib/botDetection.ts

const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /preview/i, /scanner/i,
  /validator/i, /linkcheck/i, /facebookexternalhit/i,
  /Twitterbot/i, /LinkedInBot/i, /Slackbot/i,
  /WhatsApp/i, /Googlebot/i, /bingbot/i, /DuckDuckBot/i,
  // Email security scanners — these are the most common false positives
  // in phishing simulation platforms
  /Barracuda/i, /Proofpoint/i, /Mimecast/i, /Symantec/i,
  /MessageLabs/i, /IronPort/i, /ScanSafe/i, /Websense/i,
  /TrendMicro/i, /Sophos/i, /ESET/i, /Kaspersky/i,
  // Generic patterns
  /curl\/\d/i, /wget\/\d/i, /python-requests/i, /Go-http-client/i,
  /libwww-perl/i, /Typhoeus/i, /http_request2/i,
];

// Heuristics: bots often click within milliseconds of SMS delivery
// Real humans take at least a few seconds to read and tap
const MIN_HUMAN_CLICK_DELAY_MS = 3000;

export function isBotUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 10) return true; // Empty UA is suspicious
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

export function isSuspiciousClickTiming(
  smsSentAt: Date | undefined,
  clickedAt: Date
): boolean {
  if (!smsSentAt) return false;
  return (clickedAt.getTime() - smsSentAt.getTime()) < MIN_HUMAN_CLICK_DELAY_MS;
}

export function classifyClick(params: {
  userAgent:  string;
  ipAddress:  string;
  smsSentAt?: Date;
  clickedAt:  Date;
}): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (isBotUserAgent(params.userAgent)) {
    reasons.push('bot_user_agent');
  }

  if (isSuspiciousClickTiming(params.smsSentAt, params.clickedAt)) {
    reasons.push('suspicious_click_timing');
  }

  // Multiple clicks from the same IP within the same campaign
  // (checked externally — this function only classifies a single click)

  return { isBot: reasons.length > 0, reasons };
}