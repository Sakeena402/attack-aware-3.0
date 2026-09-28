import crypto from 'crypto';
import { User } from '../models/User.js';

// Slugify a name/company piece for use in an email local-part or domain
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '');
}

/**
 * Generates a unique company email like firstname.lastname@companyname.com
 * companyName should come from Company.companyName (fetched via companyId)
 * Appends a number on collision (e.g. john.doe2@companyname.com)
 */
export async function generateCompanyEmail(
  fullName: string,
  companyName: string
): Promise<string> {
  const parts = fullName.trim().split(/\s+/);
  const first = slugify(parts[0] || 'user');
  const last = slugify(parts.slice(1).join('') || '');
  const domain = slugify(companyName);

  const localBase = last ? `${first}.${last}` : first;
  let candidate = `${localBase}@${domain}.com`;
  let suffix = 1;

  while (await User.exists({ email: candidate })) {
    suffix += 1;
    candidate = `${localBase}${suffix}@${domain}.com`;
  }

  return candidate;
}

/** Random placeholder password — never used for actual login, just satisfies passwordHash requirement */
export function generateRandomPassword(length = 20): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/** Secure token + expiry for the "set your password" email link */
export function generatePasswordSetupToken(): {
  token: string;
  hashedToken: string;
  expires: Date;
} {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48 hours

  return { token, hashedToken, expires };
}