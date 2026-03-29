'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  department?: string;
  points?: number;
  badge?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'REFRESH_TOKEN'; payload: { token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string; refreshToken: string } };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload.token,
      };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('user');
    if (token && user && refreshToken) {
      try {
        const userData = JSON.parse(user);
        dispatch({ type: 'RESTORE_SESSION', payload: { user: userData, token, refreshToken } });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      const { user, token, refreshToken } = data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token, refreshToken } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role = 'employee') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, passwordHash: password, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      const { user, token } = data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'REGISTER_SUCCESS', payload: { user, token } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}




// 'use client';

// import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// export interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: 'super_admin' | 'admin' | 'employee';
//   companyId?: string;
//   department?: string;
//   points?: number;
//   badge?: string;
// }

// interface AuthState {
//   user: User | null;
//   token: string | null;
//   isLoading: boolean;
//   isAuthenticated: boolean;
//   error: string | null;
// }

// interface AuthContextType {
//   state: AuthState;
//   login: (email: string, password: string) => Promise<void>;
//   register: (name: string, email: string, password: string, role?: string) => Promise<void>;
//   logout: () => void;
//   clearError: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// const initialState: AuthState = {
//   user: null,
//   token: null,
//   isLoading: false,
//   isAuthenticated: false,
//   error: null,
// };

// type AuthAction =
//   | { type: 'SET_LOADING'; payload: boolean }
//   | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
//   | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
//   | { type: 'LOGOUT' }
//   | { type: 'SET_ERROR'; payload: string }
//   | { type: 'CLEAR_ERROR' }
//   | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

// function authReducer(state: AuthState, action: AuthAction): AuthState {
//   switch (action.type) {
//     case 'SET_LOADING':
//       return { ...state, isLoading: action.payload };
//     case 'LOGIN_SUCCESS':
//     case 'REGISTER_SUCCESS':
//     case 'RESTORE_SESSION':
//       return {
//         ...state,
//         user: action.payload.user,
//         token: action.payload.token,
//         isAuthenticated: true,
//         isLoading: false,
//         error: null,
//       };
//     case 'LOGOUT':
//       return { ...initialState };
//     case 'SET_ERROR':
//       return { ...state, error: action.payload, isLoading: false };
//     case 'CLEAR_ERROR':
//       return { ...state, error: null };
//     default:
//       return state;
//   }
// }

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [state, dispatch] = useReducer(authReducer, initialState);

//   // Restore session on mount
//   React.useEffect(() => {
//     const token = localStorage.getItem('token');
//     const user = localStorage.getItem('user');
//     if (token && user) {
//       try {
//         const userData = JSON.parse(user);
//         dispatch({ type: 'RESTORE_SESSION', payload: { user: userData, token } });
//       } catch (error) {
//         console.error('Failed to restore session:', error);
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//       }
//     }
//   }, []);

//  // AuthContext.tsx
// const login = useCallback(async (email: string, password: string) => {
//   dispatch({ type: 'SET_LOADING', payload: true });
//   try {
//     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email, password }) // THIS MUST MATCH BACKEND
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.error || error.message || 'Login failed'); // parse backend error properly
//     }

//     const data = await response.json();
//     const { user, token } = data.data;

//     localStorage.setItem('token', token);
//     localStorage.setItem('user', JSON.stringify(user));

//     dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
//   } catch (error) {
//     const message = error instanceof Error ? error.message : 'Login failed';
//     dispatch({ type: 'SET_ERROR', payload: message });
//     throw error;
//   }
// }, []);

//   const register = useCallback(async (name: string, email: string, password: string, role = 'employee') => {
//     dispatch({ type: 'SET_LOADING', payload: true });
//     try {
//       const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ name, email, password, role })
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Registration failed');
//       }

//       const data = await response.json();
//       const { user, token } = data.data;

//       localStorage.setItem('token', token);
//       localStorage.setItem('user', JSON.stringify(user));

//       dispatch({ type: 'REGISTER_SUCCESS', payload: { user, token } });
//     } catch (error) {
//       const message = error instanceof Error ? error.message : 'Registration failed';
//       dispatch({ type: 'SET_ERROR', payload: message });
//       throw error;
//     }
//   }, []);

//   const logout = useCallback(() => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     dispatch({ type: 'LOGOUT' });
//   }, []);

//   const clearError = useCallback(() => {
//     dispatch({ type: 'CLEAR_ERROR' });
//   }, []);

//   const value: AuthContextType = {
//     state,
//     login,
//     register,
//     logout,
//     clearError,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within AuthProvider');
//   }
//   return context;
// }
