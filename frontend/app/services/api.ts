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
  return () => {
    errorHandlers.delete(handler);
  };
};

export function getErrorMessage(error: ApiError): string {
  if (!error.errorCode) return error.message || 'An unexpected error occurred';
  
  switch (error.errorCode) {
    case ErrorCodes.INVALID_CREDENTIALS:
      return 'Invalid email or password.';
    case ErrorCodes.TOKEN_EXPIRED:
      return 'Your session has expired. Please login again.';
    case ErrorCodes.TOKEN_INVALID:
      return 'Invalid session. Please login again.';
    case ErrorCodes.UNAUTHORIZED:
      return 'You must be logged in to access this resource.';
    case ErrorCodes.FORBIDDEN:
      return 'You do not have permission to access this resource.';
    case ErrorCodes.VALIDATION_ERROR:
      return error.message || 'Please check your inputs.';
    case ErrorCodes.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorCodes.ALREADY_EXISTS:
      return 'This resource already exists.';
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return 'Too many requests. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred';
  }
}

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



import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// ✅ Add token dynamically (VERY IMPORTANT FIX)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});




