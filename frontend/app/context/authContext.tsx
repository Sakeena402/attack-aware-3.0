// 'use client';

// import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
// import { authApi, ApiError, getErrorMessage, ErrorCodes } from '@/app/services/api';

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
//   refreshToken: string | null;
//   isLoading: boolean;
//   isAuthenticated: boolean;
//   error: string | null;
//   errorCode: string | null;
// }

// interface AuthContextType {
//   state: AuthState;
//   login: (email: string, password: string) => Promise<void>;
//   register: (name: string, email: string, password: string, role?: string) => Promise<void>;
//   logout: () => void;
//   clearError: () => void;
//   refreshUser: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// const initialState: AuthState = {
//   user: null,
//   token: null,
//   refreshToken: null,
//   isLoading: false,
//   isAuthenticated: false,
//   error: null,
//   errorCode: null,
// };

// type AuthAction =
//   | { type: 'SET_LOADING'; payload: boolean }
//   | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
//   | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
//   | { type: 'REFRESH_TOKEN'; payload: { token: string; refreshToken?: string } }
//   | { type: 'LOGOUT' }
//   | { type: 'SET_ERROR'; payload: { message: string; code: string | null } }
//   | { type: 'CLEAR_ERROR' }
//   | { type: 'RESTORE_SESSION'; payload: { user: User; token: string; refreshToken: string } }
//   | { type: 'UPDATE_USER'; payload: User };

// function authReducer(state: AuthState, action: AuthAction): AuthState {
//   switch (action.type) {
//     case 'SET_LOADING':
//       return { ...state, isLoading: action.payload, error: null };
//     case 'LOGIN_SUCCESS':
//     case 'REGISTER_SUCCESS':
//     case 'RESTORE_SESSION':
//       return {
//         ...state,
//         user: action.payload.user,
//         token: action.payload.token,
//         refreshToken: action.payload.refreshToken,
//         isAuthenticated: true,
//         isLoading: false,
//         error: null,
//         errorCode: null,
//       };
//     case 'REFRESH_TOKEN':
//       return {
//         ...state,
//         token: action.payload.token,
//         refreshToken: action.payload.refreshToken || state.refreshToken,
//       };
//     case 'UPDATE_USER':
//       return {
//         ...state,
//         user: action.payload,
//       };
//     case 'LOGOUT':
//       return { ...initialState };
//     case 'SET_ERROR':
//       return { 
//         ...state, 
//         error: action.payload.message, 
//         errorCode: action.payload.code,
//         isLoading: false 
//       };
//     case 'CLEAR_ERROR':
//       return { ...state, error: null, errorCode: null };
//     default:
//       return state;
//   }
// }

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [state, dispatch] = useReducer(authReducer, initialState);

//   // Restore session on mount
//   // React.useEffect(() => {
//   //   const restoreSession = async () => {
//   //     const token = localStorage.getItem('token');
//   //     const refreshToken = localStorage.getItem('refreshToken');
//   //     const userStr = localStorage.getItem('user');
      
//   //     if (token && refreshToken && userStr) {
//   //       try {
//   //         const user = JSON.parse(userStr);
//   //         dispatch({ 
//   //           type: 'RESTORE_SESSION', 
//   //           payload: { user, token, refreshToken } 
//   //         });
          
//   //         // Verify token is still valid by fetching current user
//   //         try {
//   //           const response = await authApi.me();
//   //           if (response.data) {
//   //             const updatedUser = {
//   //               id: response.data._id,
//   //               name: response.data.name,
//   //               email: response.data.email,
//   //               role: response.data.role as User['role'],
//   //               companyId: response.data.companyId,
//   //               department: response.data.department,
//   //               points: response.data.points,
//   //               badge: response.data.badge,
//   //             };
//   //             dispatch({ type: 'UPDATE_USER', payload: updatedUser });
//   //             localStorage.setItem('user', JSON.stringify(updatedUser));
//   //           }
//   //         } catch {
//   //           // Token might be expired, but refresh will handle it
//   //         }
//   //       } catch (error) {
//   //         console.error('Failed to restore session:', error);
//   //         localStorage.removeItem('token');
//   //         localStorage.removeItem('refreshToken');
//   //         localStorage.removeItem('user');
//   //       }
//   //     }
//   //   };
    
//   //   restoreSession();
//   // }, []);


//   React.useEffect(() => {
//   const restoreSession = async () => {
//     try {
//       console.log('🔵 Attempting session restore...');

//       // ✅ Call refresh endpoint (cookie-based)
//       const res = await authApi.refresh(); // must send withCredentials

//       const { token, user } = res.data.data;

//       console.log('✅ Session restored:', user);

//       // ✅ Store only what is needed
//       localStorage.setItem('token', token);
//       localStorage.setItem('user', JSON.stringify(user));

//       dispatch({
//         type: 'RESTORE_SESSION',
//         payload: {
//           user,
//           token,
//         },
//       });

//     } catch (error) {
//       console.log('❌ No valid session, user logged out');

//       // साफ cleanup (important)
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');

//       dispatch({ type: 'LOGOUT' });
//     }
//   };

//   restoreSession();
// }, []);
//   const login = useCallback(async (email: string, password: string) => {
//     dispatch({ type: 'SET_LOADING', payload: true });
//     dispatch({ type: 'CLEAR_ERROR' });
    
//     try {
//       const response = await authApi.login(email, password);
//       const { user: userData, token, refreshToken } = response.data;
      
//       const user: User = {
//         id: userData._id,
//         name: userData.name,
//         email: userData.email,
//         role: userData.role as User['role'],
//         companyId: userData.companyId,
//         department: userData.department,
//         points: userData.points,
//         badge: userData.badge,
//       };

//       localStorage.setItem('token', token);
//       localStorage.setItem('refreshToken', refreshToken);
//       localStorage.setItem('user', JSON.stringify(user));

//       dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token, refreshToken } });
//     } catch (error) {
//       let message = 'Login failed. Please try again.';
//       let code: string | null = null;
      
//       if (error instanceof ApiError) {
//         message = getErrorMessage(error);
//         code = error.errorCode || null;
        
//         // Specific error messages for common login errors
//         if (error.errorCode === ErrorCodes.INVALID_CREDENTIALS) {
//           message = 'Invalid email or password.';
//         } else if (error.errorCode === ErrorCodes.RATE_LIMIT_EXCEEDED) {
//           message = 'Too many login attempts. Please wait a few minutes.';
//         }
//       }
      
//       dispatch({ type: 'SET_ERROR', payload: { message, code } });
//       throw error;
//     }
//   }, []);

//   const register = useCallback(async (name: string, email: string, password: string, role = 'employee') => {
//     dispatch({ type: 'SET_LOADING', payload: true });
//     dispatch({ type: 'CLEAR_ERROR' });
    
//     try {
//       const response = await authApi.register({ name, email, password, role });
//       const { user: userData, token, refreshToken } = response.data;
      
//       const user: User = {
//         id: userData._id,
//         name: userData.name,
//         email: userData.email,
//         role: userData.role as User['role'],
//         companyId: userData.companyId,
//         department: userData.department,
//       };

//       localStorage.setItem('token', token);
//       localStorage.setItem('refreshToken', refreshToken);
//       localStorage.setItem('user', JSON.stringify(user));

//       dispatch({ type: 'REGISTER_SUCCESS', payload: { user, token, refreshToken } });
//     } catch (error) {
//       let message = 'Registration failed. Please try again.';
//       let code: string | null = null;
      
//       if (error instanceof ApiError) {
//         message = getErrorMessage(error);
//         code = error.errorCode || null;
        
//         // Specific error messages for common registration errors
//         if (error.errorCode === ErrorCodes.DB_DUPLICATE_KEY) {
//           message = 'An account with this email already exists.';
//         } else if (error.errorCode === ErrorCodes.VALIDATION_ERROR) {
//           message = getErrorMessage(error);
//         }
//       }
      
//       dispatch({ type: 'SET_ERROR', payload: { message, code } });
//       throw error;
//     }
//   }, []);

//   const logout = useCallback(() => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('refreshToken');
//     localStorage.removeItem('user');
//     dispatch({ type: 'LOGOUT' });
//   }, []);

//   const clearError = useCallback(() => {
//     dispatch({ type: 'CLEAR_ERROR' });
//   }, []);

//   const refreshUser = useCallback(async () => {
//     try {
//       const response = await authApi.me();
//       if (response.data) {
//         const updatedUser: User = {
//           id: response.data._id,
//           name: response.data.name,
//           email: response.data.email,
//           role: response.data.role as User['role'],
//           companyId: response.data.companyId,
//           department: response.data.department,
//           points: response.data.points,
//           badge: response.data.badge,
//         };
//         dispatch({ type: 'UPDATE_USER', payload: updatedUser });
//         localStorage.setItem('user', JSON.stringify(updatedUser));
//       }
//     } catch (error) {
//       // If refresh fails with 401, logout
//       if (error instanceof ApiError && error.statusCode === 401) {
//         logout();
//       }
//     }
//   }, [logout]);

//   const value: AuthContextType = {
//     state,
//     login,
//     register,
//     logout,
//     clearError,
//     refreshUser,
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



'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { authApi, ApiError, getErrorMessage, ErrorCodes } from '@/app/services/api';

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
  errorCode: string | null;
  isHydrated: boolean; // NEW: Track if session restoration is complete
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  errorCode: null,
  isHydrated: false, // NEW: Start not hydrated
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'REFRESH_TOKEN'; payload: { token: string; refreshToken?: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: { message: string; code: string | null } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string; refreshToken: string } }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'HYDRATION_COMPLETE' }; // NEW: Mark hydration complete

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
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
        errorCode: null,
        isHydrated: true, // NEW: Mark as hydrated after restoring
      };
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken || state.refreshToken,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'LOGOUT':
      return { ...initialState, isHydrated: true }; // NEW: Keep hydrated flag when logging out
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload.message, 
        errorCode: action.payload.code,
        isLoading: false 
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null, errorCode: null };
    case 'HYDRATION_COMPLETE': // NEW: Handle hydration complete
      return { ...state, isHydrated: true };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');
        
        if (token && refreshToken && userStr) {
          try {
            const user = JSON.parse(userStr);
            dispatch({ 
              type: 'RESTORE_SESSION', 
              payload: { user, token, refreshToken } 
            });
            
            // Verify token is still valid by fetching current user
            try {
              const response = await authApi.me();
              if (response.data) {
                const updatedUser = {
                  id: response.data._id,
                  name: response.data.name,
                  email: response.data.email,
                  role: response.data.role as User['role'],
                  companyId: response.data.companyId,
                  department: response.data.department,
                  points: response.data.points,
                  badge: response.data.badge,
                };
                dispatch({ type: 'UPDATE_USER', payload: updatedUser });
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } catch (error) {
              console.error('[v0] Token verification failed, will retry on next request:', error);
              // Token might be expired, but refresh will handle it
            }
          } catch (error) {
            console.error('[v0] Failed to parse stored session:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            dispatch({ type: 'HYDRATION_COMPLETE' });
          }
        } else {
          // No stored session, hydration complete
          dispatch({ type: 'HYDRATION_COMPLETE' });
        }
      } finally {
        // Always mark hydration as complete, even if there was an error
        // This ensures the UI doesn't stay in loading state forever
        setTimeout(() => {
          dispatch({ type: 'HYDRATION_COMPLETE' });
        }, 100);
      }
    };
    
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const response = await authApi.login(email, password);
      const { user: userData, token, refreshToken } = response.data;
      
      const user: User = {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role as User['role'],
        companyId: userData.companyId,
        department: userData.department,
        points: userData.points,
        badge: userData.badge,
      };

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token, refreshToken } });
    } catch (error) {
      let message = 'Login failed. Please try again.';
      let code: string | null = null;
      
      if (error instanceof ApiError) {
        message = getErrorMessage(error);
        code = error.errorCode || null;
        
        // Specific error messages for common login errors
        if (error.errorCode === ErrorCodes.INVALID_CREDENTIALS) {
          message = 'Invalid email or password.';
        } else if (error.errorCode === ErrorCodes.RATE_LIMIT_EXCEEDED) {
          message = 'Too many login attempts. Please wait a few minutes.';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: { message, code } });
      throw error;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role = 'employee') => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const response = await authApi.register({ name, email, password, role });
      const { user: userData, token, refreshToken } = response.data;
      
      const user: User = {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role as User['role'],
        companyId: userData.companyId,
        department: userData.department,
      };

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'REGISTER_SUCCESS', payload: { user, token, refreshToken } });
    } catch (error) {
      let message = 'Registration failed. Please try again.';
      let code: string | null = null;
      
      if (error instanceof ApiError) {
        message = getErrorMessage(error);
        code = error.errorCode || null;
        
        // Specific error messages for common registration errors
        if (error.errorCode === ErrorCodes.DB_DUPLICATE_KEY) {
          message = 'An account with this email already exists.';
        } else if (error.errorCode === ErrorCodes.VALIDATION_ERROR) {
          message = getErrorMessage(error);
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: { message, code } });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      if (response.data) {
        const updatedUser: User = {
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role as User['role'],
          companyId: response.data.companyId,
          department: response.data.department,
          points: response.data.points,
          badge: response.data.badge,
        };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      // If refresh fails with 401, logout
      if (error instanceof ApiError && error.statusCode === 401) {
        logout();
      }
    }
  }, [logout]);

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
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
