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
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
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
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: User }
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

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const { user } = await authApi.login(email, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
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

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: string = 'employee'
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const { user } = await authApi.register({ name, email, password, role });
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
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
    <AuthContext.Provider value={{ state, login, register, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
