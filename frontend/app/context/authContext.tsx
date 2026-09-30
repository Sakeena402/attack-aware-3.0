// frontend/app/context/authContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { authApi, User } from '../services/authApi';
import { ApiError, ErrorCodes } from '../services/api';

export type { User };

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  errorCode: string | null;
  isHydrated: boolean;
  // ── Login 2FA / OTP ──────────────────────────────────────────────────────
  otpRequired: boolean;
  pendingEmail: string | null;
  pendingToken: string | null;
  // ── Signup email-verification OTP ───────────────────────────────────────
  signupOtpRequired: boolean;
  pendingSignupEmail: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  verifyOtp: (tempToken: string, code: string) => Promise<void>;
  resendOtp: (tempToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  verifySignupOtp: (email: string, code: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  errorCode: null,
  isHydrated: false,
  otpRequired: false,
  pendingEmail: null,
  pendingToken: null,
  signupOtpRequired: false,
  pendingSignupEmail: null,
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'OTP_REQUIRED'; payload: { email: string; tempToken: string } }
  | { type: 'OTP_TOKEN_UPDATED'; payload: string }
  | { type: 'SIGNUP_OTP_REQUIRED'; payload: { email: string } }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: { message: string; code: string | null } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'HYDRATION_COMPLETE' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        isHydrated: true,
        otpRequired: false,
        pendingEmail: null,
        pendingToken: null,
        signupOtpRequired: false,
        pendingSignupEmail: null,
      };
    case 'OTP_REQUIRED':
      return {
        ...state,
        isLoading: false,
        error: null,
        errorCode: null,
        otpRequired: true,
        pendingEmail: action.payload.email,
        pendingToken: action.payload.tempToken,
      };
    case 'OTP_TOKEN_UPDATED':
      return { ...state, pendingToken: action.payload };
    case 'SIGNUP_OTP_REQUIRED':
      return {
        ...state,
        isLoading: false,
        error: null,
        errorCode: null,
        signupOtpRequired: true,
        pendingSignupEmail: action.payload.email,
      };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    case 'LOGOUT':
      return { ...initialState, isHydrated: true };
    case 'SET_ERROR':
      return { ...state, error: action.payload.message, errorCode: action.payload.code, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null, errorCode: null };
    case 'HYDRATION_COMPLETE':
      return { ...state, isHydrated: true };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: silently check whether an existing session cookie is still valid.
  // No localStorage involved — the browser sends the cookie automatically.
  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await authApi.me();
        if (user) {
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        dispatch({ type: 'HYDRATION_COMPLETE' });
      }
    };

    restoreSession();
  }, []);

  // Step 1: verify email + password. On success this does NOT log the user
  // in yet — it only signals that a one-time code was emailed. The session
  // is only established once verifyOtp() succeeds.
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await authApi.login(email, password);
      if (response.requires2FA === true) {
        dispatch({
          type: 'OTP_REQUIRED',
          payload: { email: response.email, tempToken: response.tempToken },
        });
        return true;
      }

      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      return false;
    } catch (error) {
      let message = 'Login failed. Please try again.';
      let code: string | null = null;

      if (error instanceof ApiError) {
        message = error.message || message;
        code = error.errorCode || null;
        if (error.errorCode === ErrorCodes.INVALID_CREDENTIALS) {
          message = 'Invalid email or password.';
        }
      }

      dispatch({ type: 'SET_ERROR', payload: { message, code } });
      throw error;
    }
  }, []);

  // Step 2: submit the 6-digit code. On success this is what actually
  // completes login — cookies are set by the backend at this point.
  const verifyOtp = useCallback(async (tempToken: string, code: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const { user } = await authApi.verifyOtp(tempToken, code);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      let message = 'Verification failed. Please try again.';
      let code: string | null = null;

      if (error instanceof ApiError) {
        message = error.message || message;
        code = error.errorCode || null;
      }

      dispatch({ type: 'SET_ERROR', payload: { message, code } });
      throw error;
    }
  }, []);

  const resendOtp = useCallback(async (tempToken: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const response = await authApi.resendOtp(tempToken);
      if (response.tempToken) dispatch({ type: 'OTP_TOKEN_UPDATED', payload: response.tempToken });
    } catch (error) {
      let message = 'Failed to resend code. Please try again.';
      if (error instanceof ApiError) message = error.message || message;
      dispatch({ type: 'SET_ERROR', payload: { message, code: null } });
      throw error;
    }
  }, []);

  // Step 1 of signup: creates the account and triggers an email-verification
  // OTP. Does NOT authenticate the user — that only happens after
  // verifySignupOtp() succeeds, so we move into the signup-OTP state here
  // instead of dispatching AUTH_SUCCESS.
  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: string = 'employee'
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      await authApi.register({ name, email, password, role });
      dispatch({ type: 'SIGNUP_OTP_REQUIRED', payload: { email } });
    } catch (error) {
      let message = 'Registration failed. Please try again.';
      let code: string | null = null;

      if (error instanceof ApiError) {
        message = error.message || message;
        code = error.errorCode || null;
        if (error.errorCode === ErrorCodes.DB_DUPLICATE_KEY) {
          message = 'An account with this email already exists.';
        }
      }

      dispatch({ type: 'SET_ERROR', payload: { message, code } });
      throw error;
    }
  }, []);

  // Step 2 of signup: submits the 6-digit email-verification code. On
  // success the backend marks emailVerified: true and completes the login
  // in the same call — cookies are set here, same as verifyOtp() for login.
  const verifySignupOtp = useCallback(async (email: string, code: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const { user } = await authApi.verifySignupOtp(email, code);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      let message = 'Verification failed. Please try again.';
      let code2: string | null = null;

      if (error instanceof ApiError) {
        message = error.message || message;
        code2 = error.errorCode || null;
      }

      dispatch({ type: 'SET_ERROR', payload: { message, code: code2 } });
      throw error;
    }
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      await authApi.resendSignupOtp(email);
    } catch (error) {
      let message = 'Failed to resend code. Please try again.';
      if (error instanceof ApiError) message = error.message || message;
      dispatch({ type: 'SET_ERROR', payload: { message, code: null } });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(); // Tells backend to clear the cookies
    } catch {
      // Even if the request fails, clear client state
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me();
      if (user) {
        dispatch({ type: 'UPDATE_USER', payload: user });
      } else {
        logout();
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        logout();
      }
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        verifyOtp,
        resendOtp,
        register,
        verifySignupOtp,
        resendSignupOtp,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}