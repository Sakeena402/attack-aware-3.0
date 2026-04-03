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
}

// The backend never sends tokens in the response body — they live in httpOnly cookies.
// AuthResponse therefore only carries user data.
export interface AuthResponse {
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // credentials: 'include' is set globally in ApiService.executeRequest
    const res = await apiService.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },

  register: async (payload: Pick<User, 'name' | 'email'> & { password: string; role?: string }): Promise<AuthResponse> => {
    const res = await apiService.post<AuthResponse>('/auth/register', payload);
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
};