// frontend/app/services/authApi.ts
import { apiService } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  department?: string;
  points?: number;
  badge?: string | null;
  twoFactorEnabled?: boolean;
}

// The backend never sends tokens in the response body — they live in httpOnly cookies.
// AuthResponse therefore only carries user data.
export interface AuthResponse {
  requires2FA?: false;
  user: User;
}

// Returned by /auth/login now that a verification step sits in between
// password check and an actual session — no user/tokens yet, just a
// signal that a code was emailed and which address it went to.
export interface LoginOtpResponse {
  requires2FA: true;
  tempToken: string;
  email: string;
}

// Returned by /auth/register — the backend does NOT issue a session here.
// It only creates the user (unverified) and emails a signup OTP.
export interface RegisterResponse {
  message?: string;
}

// Returned by /auth/resend-signup-otp — just a confirmation message.
export interface ResendSignupOtpResponse {
  message?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse | LoginOtpResponse> => {
    // credentials: 'include' is set globally in ApiService.executeRequest
    const res = await apiService.post<AuthResponse | LoginOtpResponse>('/auth/login', { email, password });
    return res.data;
  },

  // Step 2 of login: submits the 6-digit code emailed to the user.
  // On success this is what actually establishes the session (cookies set).
  verifyOtp: async (tempToken: string, code: string): Promise<AuthResponse> => {
    const res = await apiService.post<AuthResponse>('/auth/verify-otp', { tempToken, code });
    return res.data;
  },

  // Requests a fresh code be emailed (e.g. if the first one expired or
  // wasn't received).
  resendOtp: async (tempToken: string): Promise<{ message?: string; tempToken?: string }> => {
    const res = await apiService.post<{ message?: string; tempToken?: string }>('/auth/resend-otp', { tempToken });
    return res.data;
  },

  // Step 1 of signup: creates the user (emailVerified: false) and emails a
  // verification OTP. Does NOT return a user/session — that only happens
  // after verifySignupOtp() succeeds.
  register: async (
    payload: Pick<User, 'name' | 'email'> & { password: string; role?: string }
  ): Promise<RegisterResponse> => {
    const res = await apiService.post<RegisterResponse>('/auth/register', payload);
    return res.data;
  },

  // Step 2 of signup: submits the 6-digit email-verification code.
  // On success the backend sets emailVerified: true AND completes the
  // login (cookies set) — this is what actually returns user data.
  verifySignupOtp: async (email: string, code: string): Promise<AuthResponse> => {
    const res = await apiService.post<AuthResponse>('/auth/verify-signup-otp', { email, code });
    return res.data;
  },

  // Requests a fresh signup-verification code (60s cooldown enforced
  // server-side).
  resendSignupOtp: async (email: string): Promise<ResendSignupOtpResponse> => {
    const res = await apiService.post<ResendSignupOtpResponse>('/auth/resend-signup-otp', { email });
    return res.data;
  },

  // Called silently on app load to rehydrate user state.
  // Returns null instead of throwing so callers can treat a missing session gracefully.
  me: async (): Promise<User | null> => {
    try {
      const res = await apiService.get<User>('/auth/me');
      return res.data;
    } catch {
      return null;
    }
  },

  // The browser sends the refreshToken cookie automatically; no body is required.
  refresh: async (): Promise<AuthResponse | null> => {
    try {
      const res = await apiService.post<AuthResponse>('/auth/refresh');
      return res.data;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await apiService.post('/auth/logout');
  },

  // ── 2FA settings toggle (PATCH /users/me/2fa) ────────────────────────────
  // Enabling is two calls:
  //   1) { enable: true }                → backend emails an OTP, returns { otpSent: true }
  //   2) { enable: true, code: '123456' } → backend verifies it, sets twoFactorEnabled: true
  // Disabling is one call with the current password:
  //   { enable: false, password: '...' } → backend verifies password, sets twoFactorEnabled: false
  toggle2FA: async (
    body: { enable: true; code?: string } | { enable: false; password: string }
  ): Promise<{ otpSent?: boolean; message?: string }> => {
    const res = await apiService.patch<{ otpSent?: boolean }>('/users/me/2fa', body);
    return { otpSent: res.data?.otpSent, message: res.message };
  },
};