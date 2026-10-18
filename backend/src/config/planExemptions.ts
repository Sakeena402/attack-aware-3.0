// backend/src/config/planExemptions.ts
// Accounts listed here skip ALL plan limits (channels, AI, monthly quotas, seats,
// company approval, trial expiry). Role whitelists and cross-company ownership
// checks still apply, because those are security rules, not plan flags.
//
// Configure with PLAN_EXEMPT_EMAILS in backend/.env (comma-separated).
// If the variable is not set, the default below is used.
// Set it to an empty value (PLAN_EXEMPT_EMAILS=) to disable exemptions, e.g. in production.

const DEFAULT_EXEMPT_EMAILS = ['admin1@company1.com'];

// Read on every call so it does not depend on when dotenv is loaded.
export function getExemptEmails(): string[] {
  const raw = process.env.PLAN_EXEMPT_EMAILS;
  if (raw === undefined) return DEFAULT_EXEMPT_EMAILS;
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlanExempt(user?: { email?: string } | null): boolean {
  if (!user?.email) return false;
  return getExemptEmails().includes(user.email.toLowerCase());
}