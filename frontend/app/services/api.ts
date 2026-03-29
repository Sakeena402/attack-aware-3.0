// Centralized API Service with Authentication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

class ApiService {
  private static instance: ApiService;
  
  private constructor() {}
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private setTokens(token: string, refreshToken?: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.data.token, data.data.refreshToken);
        return data.data.token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    this.clearTokens();
    return null;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && retry) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.request<T>(endpoint, options, false);
        }
        // Redirect to login if refresh failed
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      throw new Error(message);
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = ApiService.getInstance();

// Type definitions for API responses
export interface DashboardStats {
  totalEmployees: number;
  totalCampaigns: number;
  activeCampaigns: number;
  avgClickRate: number;
  avgReportRate: number;
  totalPoints: number;
  trainingProgress: number;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  companyId: string;
  points: number;
  badge: string;
  riskLevel: 'low' | 'medium' | 'high';
  trainingProgress: number;
  lastActive: string;
  createdAt: string;
}

export interface Campaign {
  _id: string;
  campaignName: string;
  type: 'phishing' | 'smishing' | 'vishing';
  status: 'draft' | 'active' | 'completed' | 'paused';
  createdBy: string;
  companyId: string;
  targetEmployees: string[];
  startDate: string;
  endDate: string;
  clickRate: number;
  reportRate: number;
  emailTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  _id: string;
  userId: string;
  userName: string;
  department: string;
  score: number;
  rank: number;
  badge: string;
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsOverview {
  totalSimulations: number;
  clickRate: number;
  reportRate: number;
  trainingCompletion: number;
  departmentScores: { department: string; score: number }[];
  monthlyTrend: { month: string; clicks: number; reports: number }[];
  campaignPerformance: { name: string; clickRate: number; reportRate: number }[];
}

export interface Activity {
  id: string;
  type: 'campaign' | 'training' | 'alert' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

// API endpoint functions
export const authApi = {
  login: (email: string, password: string) => 
    api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role?: string }) => 
    api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/register', data),
  refresh: (refreshToken: string) => 
    api.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  me: () => api.get<Employee>('/auth/me'),
};

export const employeeApi = {
  getAll: (companyId?: string) => 
    api.get<Employee[]>(`/employees${companyId ? `?companyId=${companyId}` : ''}`),
  getById: (id: string) => api.get<Employee>(`/employees/${id}`),
  create: (data: Partial<Employee>) => api.post<Employee>('/employees', data),
  update: (id: string, data: Partial<Employee>) => api.put<Employee>(`/employees/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/employees/${id}`),
  getByDepartment: (department: string) => api.get<Employee[]>(`/employees/department/${department}`),
};

export const campaignApi = {
  getAll: (companyId?: string) => 
    api.get<Campaign[]>(`/campaigns${companyId ? `?companyId=${companyId}` : ''}`),
  getById: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  create: (data: Partial<Campaign>) => api.post<Campaign>('/campaigns', data),
  update: (id: string, data: Partial<Campaign>) => api.put<Campaign>(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/campaigns/${id}`),
  launch: (id: string) => api.post<Campaign>(`/campaigns/${id}/launch`),
  pause: (id: string) => api.post<Campaign>(`/campaigns/${id}/pause`),
};

export const analyticsApi = {
  getOverview: (companyId?: string) => 
    api.get<AnalyticsOverview>(`/analytics/overview${companyId ? `?companyId=${companyId}` : ''}`),
  getDashboard: (companyId?: string) => 
    api.get<DashboardStats>(`/analytics/dashboard${companyId ? `?companyId=${companyId}` : ''}`),
  getCampaignStats: (campaignId: string) => 
    api.get<{ clickRate: number; reportRate: number; timeline: { date: string; clicks: number }[] }>(`/analytics/campaign/${campaignId}`),
  getGlobal: () => api.get<AnalyticsOverview>('/analytics/global'),
};

export const leaderboardApi = {
  getAll: (companyId?: string, department?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (department) params.append('department', department);
    const query = params.toString();
    return api.get<LeaderboardEntry[]>(`/leaderboard${query ? `?${query}` : ''}`);
  },
  getByDepartment: (department: string) => 
    api.get<LeaderboardEntry[]>(`/leaderboard/department/${department}`),
  getUserRank: (userId: string) => 
    api.get<{ rank: number; score: number; percentile: number }>(`/leaderboard/user/${userId}`),
};

export const companyApi = {
  getAll: () => api.get<{ _id: string; companyName: string; industry: string }[]>('/companies'),
  getById: (id: string) => api.get<{ _id: string; companyName: string; industry: string }>(`/companies/${id}`),
  create: (data: { companyName: string; industry: string }) => 
    api.post<{ _id: string; companyName: string; industry: string }>('/companies', data),
  update: (id: string, data: Partial<{ companyName: string; industry: string }>) => 
    api.put<{ _id: string; companyName: string; industry: string }>(`/companies/${id}`, data),
  delete: (id: string) => api.delete<{ success: boolean }>(`/companies/${id}`),
};

export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) => 
    api.post<{ success: boolean }>('/contact', data),
  getAll: () => api.get<{ _id: string; name: string; email: string; message: string; createdAt: string }[]>('/contact'),
};
