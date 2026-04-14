// frontend/app/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const ErrorCodes = {
  INVALID_CREDENTIALS: 'E1001',
  TOKEN_EXPIRED: 'E1002',
  TOKEN_INVALID: 'E1003',
  UNAUTHORIZED: 'E1004',
  FORBIDDEN: 'E1005',
  VALIDATION_ERROR: 'E2001',
  INVALID_INPUT: 'E2002',
  MISSING_FIELD: 'E2003',
  INVALID_FORMAT: 'E2004',
  NOT_FOUND: 'E3001',
  ALREADY_EXISTS: 'E3002',
  CONFLICT: 'E3003',
  DB_CONNECTION_ERROR: 'E4001',
  DB_QUERY_ERROR: 'E4002',
  DB_DUPLICATE_KEY: 'E4003',
  TWILIO_ERROR: 'E5001',
  TWILIO_SMS_FAILED: 'E5002',
  TWILIO_CALL_FAILED: 'E5003',
  EXTERNAL_API_ERROR: 'E5004',
  INTERNAL_ERROR: 'E9001',
  SERVICE_UNAVAILABLE: 'E9002',
  RATE_LIMIT_EXCEEDED: 'E9003',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  isRetryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.requestId = requestId;
    this.isRetryable =
      statusCode >= 500 ||
      statusCode === 429 ||
      errorCode === ErrorCodes.SERVICE_UNAVAILABLE ||
      errorCode === ErrorCodes.RATE_LIMIT_EXCEEDED;
  }

  static fromResponse(data: ApiErrorResponse, statusCode: number): ApiError {
    return new ApiError(data.error || 'An error occurred', statusCode, data.errorCode, data.details, data.requestId);
  }
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errorCode?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

type ErrorHandler = (error: ApiError) => void;
const errorHandlers = new Set<ErrorHandler>();
export const onApiError = (handler: ErrorHandler) => {
  errorHandlers.add(handler);
  return () => errorHandlers.delete(handler);
};
const notifyErrorHandlers = (error: ApiError) =>
  errorHandlers.forEach((h) => {
    try {
      h(error);
    } catch {}
  });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultRetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 };

export class ApiService {
  private static instance: ApiService;
  private isRefreshing = false;
  private refreshSubscribers: ((success: boolean) => void)[] = [];

  private constructor() {}

  static getInstance() {
    if (!ApiService.instance) ApiService.instance = new ApiService();
    return ApiService.instance;
  }

  // Notify all queued requests whether the refresh succeeded or not
  private onRefreshComplete(success: boolean) {
    this.refreshSubscribers.forEach((cb) => cb(success));
    this.refreshSubscribers = [];
  }

  // Attempt a silent cookie-based token refresh. Returns true on success.
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // Queue callers and wait for the in-flight refresh to finish
      return new Promise((resolve) => this.refreshSubscribers.push(resolve));
    }

    this.isRefreshing = true;
    try {
      // No body needed — the refreshToken cookie is sent automatically
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends refreshToken cookie, receives new accessToken cookie
      });

      if (res.ok) {
        this.onRefreshComplete(true);
        return true;
      }

      this.onRefreshComplete(false);
      return false;
    } catch {
      this.onRefreshComplete(false);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config?: { retry?: boolean; retryConfig?: Partial<typeof defaultRetryConfig> }
  ): Promise<ApiResponse<T>> {
    const { retry = true, retryConfig = {} } = config || {};
    const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
    let attempt = 0;
    let lastError: ApiError | null = null;

    while (attempt <= finalRetryConfig.maxRetries) {
      try {
        return await this.executeRequest<T>(endpoint, options);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          notifyErrorHandlers(error as ApiError);
          throw error;
        }

        // On 401 try a single token refresh, then retry the original request once
        if (error.statusCode === 401 && attempt === 0) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            try {
              return await this.executeRequest<T>(endpoint, options);
            } catch (retryError) {
              notifyErrorHandlers(retryError as ApiError);
              throw retryError;
            }
          }
          // Refresh failed — bubble the original 401 up
          notifyErrorHandlers(error);
          throw error;
        }

        if (!error.isRetryable || !retry) {
          notifyErrorHandlers(error);
          throw error;
        }

        lastError = error;
        await delay(Math.min(finalRetryConfig.baseDelay * Math.pow(2, attempt), finalRetryConfig.maxDelay));
        attempt++;
      }
    }

    throw lastError!;
  }

  private async executeRequest<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Always send/receive cookies
    });

    const data = await res.json();
    if (!res.ok) throw ApiError.fromResponse(data, res.status);
    return data;
  }

  get<T>(endpoint: string, config?: { retry?: boolean }) {
    return this.request<T>(endpoint, { method: 'GET' }, config);
  }
  post<T>(endpoint: string, data?: unknown, config?: { retry?: boolean }) {
    return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }, config);
  }
  put<T>(endpoint: string, data?: unknown, config?: { retry?: boolean }) {
    return this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }, config);
  }
  delete<T>(endpoint: string, config?: { retry?: boolean }) {
    return this.request<T>(endpoint, { method: 'DELETE' }, config);
  }
  patch<T>(endpoint: string, data?: unknown, config?: { retry?: boolean }) {
    return this.request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }, config);
  }
}

export const apiService = ApiService.getInstance();









// // Centralized API Service with Enhanced Error Handling
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// // Error codes matching backend
// export const ErrorCodes = {
//   // Authentication errors (1xxx)
//   INVALID_CREDENTIALS: 'E1001',
//   TOKEN_EXPIRED: 'E1002',
//   TOKEN_INVALID: 'E1003',
//   UNAUTHORIZED: 'E1004',
//   FORBIDDEN: 'E1005',
  
//   // Validation errors (2xxx)
//   VALIDATION_ERROR: 'E2001',
//   INVALID_INPUT: 'E2002',
//   MISSING_FIELD: 'E2003',
//   INVALID_FORMAT: 'E2004',
  
//   // Resource errors (3xxx)
//   NOT_FOUND: 'E3001',
//   ALREADY_EXISTS: 'E3002',
//   CONFLICT: 'E3003',
  
//   // Database errors (4xxx)
//   DB_CONNECTION_ERROR: 'E4001',
//   DB_QUERY_ERROR: 'E4002',
//   DB_DUPLICATE_KEY: 'E4003',
  
//   // External service errors (5xxx)
//   TWILIO_ERROR: 'E5001',
//   TWILIO_SMS_FAILED: 'E5002',
//   TWILIO_CALL_FAILED: 'E5003',
//   EXTERNAL_API_ERROR: 'E5004',
  
//   // Server errors (9xxx)
//   INTERNAL_ERROR: 'E9001',
//   SERVICE_UNAVAILABLE: 'E9002',
//   RATE_LIMIT_EXCEEDED: 'E9003',
// } as const;

// export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// // Custom API Error class
// export class ApiError extends Error {
//   public readonly statusCode: number;
//   public readonly errorCode?: string;
//   public readonly details?: Record<string, unknown>;
//   public readonly requestId?: string;
//   public readonly isRetryable: boolean;

//   constructor(
//     message: string,
//     statusCode: number,
//     errorCode?: string,
//     details?: Record<string, unknown>,
//     requestId?: string
//   ) {
//     super(message);
//     this.name = 'ApiError';
//     this.statusCode = statusCode;
//     this.errorCode = errorCode;
//     this.details = details;
//     this.requestId = requestId;
//     this.isRetryable = this.checkIfRetryable(statusCode, errorCode);
//   }

//   private checkIfRetryable(statusCode: number, errorCode?: string): boolean {
//     // Network errors, rate limits, and server errors are retryable
//     if (statusCode >= 500) return true;
//     if (statusCode === 429) return true;
//     if (errorCode === ErrorCodes.SERVICE_UNAVAILABLE) return true;
//     if (errorCode === ErrorCodes.RATE_LIMIT_EXCEEDED) return true;
//     return false;
//   }

//   static fromResponse(data: ApiErrorResponse, statusCode: number): ApiError {
//     return new ApiError(
//       data.error || 'An error occurred',
//       statusCode,
//       data.errorCode,
//       data.details,
//       data.requestId
//     );
//   }
// }

// interface ApiResponse<T> {
//   success: boolean;
//   data: T;
//   message?: string;
//   error?: string;
//   errorCode?: string;
//   details?: Record<string, unknown>;
//   requestId?: string;
// }

// interface ApiErrorResponse {
//   success: false;
//   error: string;
//   errorCode?: string;
//   details?: Record<string, unknown>;
//   requestId?: string;
// }

// // Event emitter for global error handling
// type ErrorHandler = (error: ApiError) => void;
// const errorHandlers: Set<ErrorHandler> = new Set();

// export const onApiError = (handler: ErrorHandler): (() => void) => {
//   errorHandlers.add(handler);
//   return () => errorHandlers.delete(handler);
// };

// const notifyErrorHandlers = (error: ApiError): void => {
//   errorHandlers.forEach(handler => {
//     try {
//       handler(error);
//     } catch (e) {
//       console.error('Error in error handler:', e);
//     }
//   });
// };

// // Retry configuration
// interface RetryConfig {
//   maxRetries: number;
//   baseDelay: number;
//   maxDelay: number;
// }

// const defaultRetryConfig: RetryConfig = {
//   maxRetries: 3,
//   baseDelay: 1000,
//   maxDelay: 10000,
// };

// const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// const calculateBackoff = (attempt: number, config: RetryConfig): number => {
//   const backoff = config.baseDelay * Math.pow(2, attempt);
//   return Math.min(backoff, config.maxDelay);
// };

// class ApiService {
//   private static instance: ApiService;
//   private isRefreshing = false;
//   private refreshSubscribers: ((token: string) => void)[] = [];
  
//   private constructor() {}
  
//   static getInstance(): ApiService {
//     if (!ApiService.instance) {
//       ApiService.instance = new ApiService();
//     }
//     return ApiService.instance;
//   }

//   private getToken(): string | null {
//     if (typeof window !== 'undefined') {
//       return localStorage.getItem('token');
//     }
//     return null;
//   }

//   private getRefreshToken(): string | null {
//     if (typeof window !== 'undefined') {
//       return localStorage.getItem('refreshToken');
//     }
//     return null;
//   }

//   private setTokens(token: string, refreshToken?: string): void {
//     if (typeof window !== 'undefined') {
//       localStorage.setItem('token', token);
//       if (refreshToken) {
//         localStorage.setItem('refreshToken', refreshToken);
//       }
//     }
//   }

//   private clearTokens(): void {
//     if (typeof window !== 'undefined') {
//       localStorage.removeItem('token');
//       localStorage.removeItem('refreshToken');
//       localStorage.removeItem('user');
//     }
//   }

//   private subscribeTokenRefresh(callback: (token: string) => void): void {
//     this.refreshSubscribers.push(callback);
//   }

//   private onTokenRefreshed(token: string): void {
//     this.refreshSubscribers.forEach(callback => callback(token));
//     this.refreshSubscribers = [];
//   }

//   private async refreshAccessToken(): Promise<string | null> {
//     const refreshToken = this.getRefreshToken();
//     if (!refreshToken) return null;

//     // If already refreshing, wait for it
//     if (this.isRefreshing) {
//       return new Promise((resolve) => {
//         this.subscribeTokenRefresh((token) => resolve(token));
//       });
//     }

//     this.isRefreshing = true;

//     try {
//       const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ refreshToken }),
//       });

//       if (response.ok) {
//         const data = await response.json();
//         this.setTokens(data.data.token, data.data.refreshToken);
//         this.onTokenRefreshed(data.data.token);
//         return data.data.token;
//       }

//       // Refresh failed - clear tokens
//       this.clearTokens();
//       return null;
//     } catch (error) {
//       console.error('Token refresh failed:', error);
//       this.clearTokens();
//       return null;
//     } finally {
//       this.isRefreshing = false;
//     }
//   }

//   async request<T>(
//     endpoint: string,
//     options: RequestInit = {},
//     config?: {
//       retry?: boolean;
//       retryConfig?: Partial<RetryConfig>;
//       skipAuth?: boolean;
//     }
//   ): Promise<ApiResponse<T>> {
//     const { retry = true, retryConfig = {}, skipAuth = false } = config || {};
//     const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
    
//     let lastError: ApiError | null = null;
//     let attempt = 0;

//     while (attempt <= finalRetryConfig.maxRetries) {
//       try {
//         return await this.executeRequest<T>(endpoint, options, skipAuth);
//       } catch (error) {
//         if (error instanceof ApiError) {
//           lastError = error;
          
//           // Don't retry auth errors or validation errors
//           if (!error.isRetryable || !retry) {
//             notifyErrorHandlers(error);
//             throw error;
//           }

//           // Handle 401 specifically
//           if (error.statusCode === 401) {
//             const newToken = await this.refreshAccessToken();
//             if (newToken) {
//               // Retry with new token
//               return await this.executeRequest<T>(endpoint, options, skipAuth);
//             }
//             // Redirect to login
//             if (typeof window !== 'undefined') {
//               window.location.href = '/login';
//             }
//             throw error;
//           }

//           // Exponential backoff for retryable errors
//           if (attempt < finalRetryConfig.maxRetries) {
//             const backoff = calculateBackoff(attempt, finalRetryConfig);
//             console.warn(`API request failed, retrying in ${backoff}ms (attempt ${attempt + 1}/${finalRetryConfig.maxRetries})`);
//             await delay(backoff);
//           }
//         } else {
//           // Unknown error
//           lastError = new ApiError(
//             error instanceof Error ? error.message : 'Unknown error',
//             0,
//             ErrorCodes.INTERNAL_ERROR
//           );
//         }
//         attempt++;
//       }
//     }

//     if (lastError) {
//       notifyErrorHandlers(lastError);
//       throw lastError;
//     }

//     throw new ApiError('Request failed after retries', 500, ErrorCodes.INTERNAL_ERROR);
//   }

//   private async executeRequest<T>(
//     endpoint: string,
//     options: RequestInit,
//     skipAuth: boolean
//   ): Promise<ApiResponse<T>> {
//     const token = this.getToken();
    
//     const headers: HeadersInit = {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     };

//     if (token && !skipAuth) {
//       (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}${endpoint}`, {
//         ...options,
//         headers,
//       });

//       // Get request ID from response headers
//       const requestId = response.headers.get('X-Request-ID') || undefined;

//       // Handle non-JSON responses
//       const contentType = response.headers.get('content-type');
//       if (!contentType?.includes('application/json')) {
//         if (!response.ok) {
//           throw new ApiError(
//             'Server returned non-JSON response',
//             response.status,
//             ErrorCodes.INTERNAL_ERROR,
//             undefined,
//             requestId
//           );
//         }
//         return { success: true, data: null as T };
//       }

//       const data = await response.json();
      
//       if (!response.ok) {
//         throw ApiError.fromResponse(data as ApiErrorResponse, response.status);
//       }

//       return data;
//     } catch (error) {
//       if (error instanceof ApiError) {
//         throw error;
//       }

//       // Network error
//       if (error instanceof TypeError && error.message.includes('fetch')) {
//         throw new ApiError(
//           'Network error. Please check your connection.',
//           0,
//           ErrorCodes.SERVICE_UNAVAILABLE
//         );
//       }

//       throw new ApiError(
//         error instanceof Error ? error.message : 'An error occurred',
//         500,
//         ErrorCodes.INTERNAL_ERROR
//       );
//     }
//   }

//   // HTTP methods with proper typing
//   async get<T>(endpoint: string, config?: { retry?: boolean }): Promise<ApiResponse<T>> {
//     return this.request<T>(endpoint, { method: 'GET' }, config);
//   }

//   async post<T>(endpoint: string, data?: unknown, config?: { retry?: boolean; skipAuth?: boolean }): Promise<ApiResponse<T>> {
//     return this.request<T>(endpoint, {
//       method: 'POST',
//       body: data ? JSON.stringify(data) : undefined,
//     }, config);
//   }

//   async put<T>(endpoint: string, data?: unknown, config?: { retry?: boolean }): Promise<ApiResponse<T>> {
//     return this.request<T>(endpoint, {
//       method: 'PUT',
//       body: data ? JSON.stringify(data) : undefined,
//     }, config);
//   }

//   async delete<T>(endpoint: string, config?: { retry?: boolean }): Promise<ApiResponse<T>> {
//     return this.request<T>(endpoint, { method: 'DELETE' }, config);
//   }

//   async patch<T>(endpoint: string, data?: unknown, config?: { retry?: boolean }): Promise<ApiResponse<T>> {
//     return this.request<T>(endpoint, {
//       method: 'PATCH',
//       body: data ? JSON.stringify(data) : undefined,
//     }, config);
//   }
// }

// export const api = ApiService.getInstance();

// // Helper function to get user-friendly error messages
// export const getErrorMessage = (error: unknown): string => {
//   if (error instanceof ApiError) {
//     // Map error codes to user-friendly messages
//     switch (error.errorCode) {
//       case ErrorCodes.TOKEN_EXPIRED:
//         return 'Your session has expired. Please login again.';
//       case ErrorCodes.TOKEN_INVALID:
//         return 'Invalid authentication. Please login again.';
//       case ErrorCodes.UNAUTHORIZED:
//         return 'Please login to continue.';
//       case ErrorCodes.FORBIDDEN:
//         return 'You do not have permission to perform this action.';
//       case ErrorCodes.VALIDATION_ERROR:
//         if (error.details?.errors && Array.isArray(error.details.errors)) {
//           return error.details.errors.map((e: { message: string }) => e.message).join(', ');
//         }
//         return error.message;
//       case ErrorCodes.NOT_FOUND:
//         return 'The requested resource was not found.';
//       case ErrorCodes.RATE_LIMIT_EXCEEDED:
//         return 'Too many requests. Please wait a moment and try again.';
//       case ErrorCodes.SERVICE_UNAVAILABLE:
//         return 'Service temporarily unavailable. Please try again later.';
//       case ErrorCodes.DB_DUPLICATE_KEY:
//         return 'This record already exists.';
//       case ErrorCodes.TWILIO_SMS_FAILED:
//         return 'Failed to send SMS. Please try again.';
//       case ErrorCodes.TWILIO_CALL_FAILED:
//         return 'Failed to initiate call. Please try again.';
//       default:
//         return error.message || 'An unexpected error occurred.';
//     }
//   }

//   if (error instanceof Error) {
//     return error.message;
//   }

//   return 'An unexpected error occurred.';
// };

// // Type definitions for API responses
// export interface DashboardStats {
//   totalEmployees: number;
//   totalCampaigns: number;
//   activeCampaigns: number;
//   avgClickRate: number;
//   avgReportRate: number;
//   totalPoints: number;
//   trainingProgress: number;
// }

// export interface Employee {
//   _id: string;
//   name: string;
//   email: string;
//   role: string;
//   department: string;
//   companyId: string;
//   points: number;
//   badge: string;
//   riskLevel: 'low' | 'medium' | 'high';
//   trainingProgress: number;
//   lastActive: string;
//   createdAt: string;
// }

// export interface Campaign {
//   _id: string;
//   campaignName: string;
//   type: 'phishing' | 'smishing' | 'vishing';
//   status: 'draft' | 'active' | 'completed' | 'paused';
//   createdBy: string;
//   companyId: string;
//   targetEmployees: string[];
//   targetDepartments: string[];
//   startDate: string;
//   endDate: string;
//   clickRate: number;
//   reportRate: number;
//   emailTemplate?: string;
//   smsTemplate?: string;
//   voiceScript?: string;
//   description?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface SmsTemplate {
//   key: string;
//   name: string;
//   preview: string;
// }

// export interface VoiceScript {
//   key: string;
//   name: string;
//   description: string;
// }

// export interface SimulationStats {
//   total: number;
//   smsSent: number;
//   smsDelivered: number;
//   smsClicked: number;
//   credentialsSubmitted: number;
//   reported: number;
//   callsInitiated: number;
//   callsAnswered: number;
//   callsEngaged: number;
//   callsReported: number;
//   deliveryRate: number;
//   clickRate: number;
//   compromiseRate: number;
//   reportRate: number;
// }

// export interface LeaderboardEntry {
//   _id: string;
//   userId: string;
//   userName: string;
//   department: string;
//   score: number;
//   rank: number;
//   badge: string;
//   trend: 'up' | 'down' | 'stable';
// }

// export interface AnalyticsOverview {
//   totalSimulations: number;
//   clickRate: number;
//   reportRate: number;
//   trainingCompletion: number;
//   departmentScores: { department: string; score: number }[];
//   monthlyTrend: { month: string; clicks: number; reports: number }[];
//   campaignPerformance: { name: string; clickRate: number; reportRate: number }[];
// }

// export interface Activity {
//   id: string;
//   type: 'campaign' | 'training' | 'alert' | 'achievement';
//   title: string;
//   description: string;
//   timestamp: string;
//   status: 'success' | 'warning' | 'info';
// }

// // API endpoint functions with error handling
// export const authApi = {
//   login: (email: string, password: string) => 
//     api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/login', { email, password }, { skipAuth: true }),
//   register: (data: { name: string; email: string; password: string; role?: string }) => 
//     api.post<{ user: Employee; token: string; refreshToken: string }>('/auth/register', data, { skipAuth: true }),
//   refresh: (refreshToken: string) => 
//     api.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }, { skipAuth: true }),
//   me: () => api.get<Employee>('/auth/me'),
// };

// export const employeeApi = {
//   getAll: (companyId?: string) => 
//    // api.get<Employee[]>(`/employees${companyId ? `?companyId=${companyId}` : ''}`),
//   api.get<Employee[]>('/employees'),
//   getById: (id: string) => api.get<Employee>(`/employees/${id}`),
//   create: (data: Partial<Employee> & { password?: string }) => api.post<Employee>('/employees', data),
//   update: (id: string, data: Partial<Employee> & { password?: string }) => api.put<Employee>(`/employees/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/employees/${id}`),
//   getByDepartment: (department: string) => api.get<Employee[]>(`/employees/department/${department}`),
// };

// export const campaignApi = {
//   getAll: (companyId?: string) => 
//    // api.get<Campaign[]>(`/campaigns${companyId ? `?companyId=${companyId}` : ''}`),
//   api.get<Employee[]>('/employees'),
//   getById: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
//   create: (data: Partial<Campaign>) => api.post<Campaign>('/campaigns', data),
//   update: (id: string, data: Partial<Campaign>) => api.put<Campaign>(`/campaigns/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/campaigns/${id}`),
//   launch: (id: string) => api.post<Campaign>(`/campaigns/${id}/launch`),
//   pause: (id: string) => api.post<Campaign>(`/campaigns/${id}/pause`),
// };

// export const analyticsApi = {
//   getOverview: (companyId?: string) => 
//     api.get<AnalyticsOverview>(`/analytics/overview${companyId ? `?companyId=${companyId}` : ''}`),
//   getDashboard: (companyId?: string) => 
//     //api.get<DashboardStats>(`/analytics/dashboard${companyId ? `?companyId=${companyId}` : ''}`),
//   api.get<DashboardStats>('/analytics/dashboard'),
//   getCampaignStats: (campaignId: string) => 
//     api.get<{ clickRate: number; reportRate: number; timeline: { date: string; clicks: number }[] }>(`/analytics/campaign/${campaignId}`),
//   getGlobal: () => api.get<AnalyticsOverview>('/analytics/global'),
// };

// export const leaderboardApi = {
//   getAll: (companyId?: string, department?: string) => {
//     const params = new URLSearchParams();
//     if (companyId) params.append('companyId', companyId);
//     if (department) params.append('department', department);
//     const query = params.toString();
//     //return api.get<LeaderboardEntry[]>(`/leaderboard${query ? `?${query}` : ''}`);
//     return api.get<DashboardStats>('/analytics/dashboard')
//   },
//   getByDepartment: (department: string) => 
//     api.get<LeaderboardEntry[]>(`/leaderboard/department/${department}`),
//   getUserRank: (userId: string) => 
//     api.get<{ rank: number; score: number; percentile: number }>(`/leaderboard/user/${userId}`),
// };

// export const superAdminApi = {
//   // Companies management
//   getCompanies: () => api.get<any[]>('/super-admin/companies'),
//   getCompany: (id: string) => api.get<any>(`/super-admin/companies/${id}`),
//   createCompany: (data: any) => api.post<any>('/super-admin/companies', data),
//   updateCompany: (id: string, data: any) => api.put<any>(`/super-admin/companies/${id}`, data),
//   deleteCompany: (id: string) => api.delete<any>(`/super-admin/companies/${id}`),
  
//   // Global analytics
//   getGlobalAnalytics: () => api.get<any>('/super-admin/analytics/global'),
  
//   // All users
//   getAllUsers: () => api.get<any[]>('/super-admin/users'),
  
//   // System health
//   getSystemHealth: () => api.get<any>('/super-admin/system/health'),
// };

// export const companyApi = {
//   getAll: () => api.get<{ _id: string; companyName: string; industry: string }[]>('/companies'),
//   getById: (id: string) => api.get<{ _id: string; companyName: string; industry: string }>(`/companies/${id}`),
//   create: (data: { companyName: string; industry: string }) => 
//     api.post<{ _id: string; companyName: string; industry: string }>('/companies', data),
//   update: (id: string, data: Partial<{ companyName: string; industry: string }>) => 
//     api.put<{ _id: string; companyName: string; industry: string }>(`/companies/${id}`, data),
//   delete: (id: string) => api.delete<{ success: boolean }>(`/companies/${id}`),
// };

// export const contactApi = {
//   submit: (data: { name: string; email: string; message: string }) => 
//     api.post<{ success: boolean }>('/contact', data, { skipAuth: true }),
//   getAll: () => api.get<{ _id: string; name: string; email: string; message: string; createdAt: string }[]>('/contact'),
// };

// // Simulation APIs (Smishing/Vishing)
// export const simulationApi = {
//   // SMS/Smishing
//   getSmsTemplates: () => api.get<SmsTemplate[]>('/simulations/sms/templates'),
//   sendSms: (data: { campaignId: string; userId: string; templateKey: string }) =>
//     api.post<{ messageSid: string; status: string }>('/simulations/sms/send', data),
//   launchSmsCampaign: (campaignId: string, data: { templateKey: string; targetDepartment?: string }) =>
//     api.post<{ total: number; sent: number; failed: number }>(`/simulations/sms/campaign/${campaignId}`, data),
//   getSmsStats: (campaignId: string) =>
//     api.get<SimulationStats>(`/simulations/sms/stats/${campaignId}`),

//   // Voice/Vishing
//   getVoiceScripts: () => api.get<VoiceScript[]>('/simulations/voice/scripts'),
//   makeCall: (data: { campaignId: string; userId: string; scriptKey: string }) =>
//     api.post<{ callSid: string; status: string }>('/simulations/voice/call', data),
//   launchVoiceCampaign: (campaignId: string, data: { scriptKey: string; targetDepartment?: string }) =>
//     api.post<{ total: number; initiated: number; failed: number }>(`/simulations/voice/campaign/${campaignId}`, data),
//   getVoiceStats: (campaignId: string) =>
//     api.get<SimulationStats>(`/simulations/voice/stats/${campaignId}`),
// };

// // Enhanced Analytics API
// export const simulationAnalyticsApi = {
//   getSimulationBreakdown: (companyId?: string) =>
//     api.get<{
//       phishing: { total: number; clicked: number; reported: number; clickRate: number; reportRate: number };
//       smishing: { sent: number; delivered: number; clicked: number; compromised: number; reported: number };
//       vishing: { initiated: number; answered: number; engaged: number; reported: number };
//       summary: { totalSimulations: number; totalCompromised: number; totalReported: number; overallRiskScore: number };
//     }>(`/analytics/simulations${companyId ? `?companyId=${companyId}` : ''}`),
//   getDepartmentRisk: (companyId?: string) =>
//     api.get<{
//       department: string;
//       employees: number;
//       avgRiskScore: number;
//       highRiskCount: number;
//       mediumRiskCount: number;
//       lowRiskCount: number;
//     }[]>(`/analytics/department-risk${companyId ? `?companyId=${companyId}` : ''}`),
// };


export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) => 
    api.post<{ success: boolean }>('/contact', data),
  getAll: () => api.get<{ _id: string; name: string; email: string; message: string; createdAt: string }[]>('/contact'),
};
