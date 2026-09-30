// frontend/app/services/errorMessage.ts
import { ApiError, getErrorMessage } from './api';

/** Turns any thrown value into text that is safe to show the user. */
export function toMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) return getErrorMessage(err) || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * True for errors caused by the company's plan (monthly limit reached, feature not in the plan,
 * company not approved, trial ended). The backend sends these as 403 without an errorCode.
 */
export function isPlanError(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 403 && !err.errorCode;
}