// backend/src/lib/stateMachine.ts

export type SimulationState = {
  smsSent: boolean;
  smsDelivered: boolean;
  linkClicked: boolean;
  credentialsSubmitted: boolean;
  reportedPhishing: boolean;
};

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * State machine for smishing simulation flow.
 *
 * Valid transitions:
 *   sms_sent         → always (initial event)
 *   sms_delivered    → requires smsSent
 *   link_clicked     → requires smsDelivered OR smsSent (delivery may not have been recorded)
 *   credentials_submitted → requires linkClicked
 *   phishing_reported     → requires smsSent (can report without clicking)
 *
 * Invalid transitions (rejected and logged, not silently ignored):
 *   credentials_submitted without prior link_clicked
 *   link_clicked without any SMS record
 *
 * Why not enforce delivered→clicked strictly?
 * Twilio delivery webhooks are delayed and sometimes arrive AFTER the click.
 * Requiring delivery confirmation would cause false rejections.
 * We require at minimum that an SMS was sent.
 */
export function validateTransition(
  eventType: string,
  currentState: SimulationState
): TransitionResult {
  switch (eventType) {
    case 'sms_sent':
      return { allowed: true };

    case 'sms_delivered':
      if (!currentState.smsSent) {
        return { allowed: false, reason: 'Cannot mark delivered without sms_sent record' };
      }
      return { allowed: true };

    case 'link_clicked':
      if (!currentState.smsSent) {
        // No SMS record at all — suspicious. Could be direct URL access or bot.
        return { allowed: false, reason: 'link_clicked without sms_sent — possible bot or direct access' };
      }
      if (currentState.linkClicked) {
        return { allowed: false, reason: 'link_clicked already recorded' };
      }
      return { allowed: true };

    case 'credentials_submitted':
      if (!currentState.linkClicked) {
        // This is the critical security gate.
        // Credential submissions without a prior click cannot be legitimate.
        return { allowed: false, reason: 'credentials_submitted without prior link_clicked' };
      }
      if (currentState.credentialsSubmitted) {
        return { allowed: false, reason: 'credentials_submitted already recorded' };
      }
      return { allowed: true };

    case 'phishing_reported':
      if (!currentState.smsSent) {
        return { allowed: false, reason: 'phishing_reported without any SMS record' };
      }
      if (currentState.reportedPhishing) {
        return { allowed: false, reason: 'phishing_reported already recorded' };
      }
      return { allowed: true };

    default:
      return { allowed: true }; // Voice events pass through — handled separately
  }
}