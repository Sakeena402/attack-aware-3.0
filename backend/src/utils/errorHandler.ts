import { Request, Response, NextFunction } from 'express';

// Error codes for categorization
export const ErrorCodes = {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS: 'E1001',
  TOKEN_EXPIRED: 'E1002',
  TOKEN_INVALID: 'E1003',
  UNAUTHORIZED: 'E1004',
  FORBIDDEN: 'E1005',
  
  // Validation errors (2xxx)
  VALIDATION_ERROR: 'E2001',
  INVALID_INPUT: 'E2002',
  MISSING_FIELD: 'E2003',
  INVALID_FORMAT: 'E2004',
  
  // Resource errors (3xxx)
  NOT_FOUND: 'E3001',
  ALREADY_EXISTS: 'E3002',
  CONFLICT: 'E3003',
  
  // Database errors (4xxx)
  DB_CONNECTION_ERROR: 'E4001',
  DB_QUERY_ERROR: 'E4002',
  DB_DUPLICATE_KEY: 'E4003',
  
  // External service errors (5xxx)
  TWILIO_ERROR: 'E5001',
  TWILIO_SMS_FAILED: 'E5002',
  TWILIO_CALL_FAILED: 'E5003',
  EXTERNAL_API_ERROR: 'E5004',
  
  // Server errors (9xxx)
  INTERNAL_ERROR: 'E9001',
  SERVICE_UNAVAILABLE: 'E9002',
  RATE_LIMIT_EXCEEDED: 'E9003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Custom AppError class with enhanced functionality
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Factory methods for common errors
  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }

  static unauthorized(message = 'Unauthorized access'): AppError {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN);
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, ErrorCodes.CONFLICT);
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): AppError {
    return new AppError(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, ErrorCodes.INTERNAL_ERROR);
  }

  static twilioError(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 502, ErrorCodes.TWILIO_ERROR, details);
  }

  static validationError(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }

  static tokenExpired(): AppError {
    return new AppError('Token has expired', 401, ErrorCodes.TOKEN_EXPIRED);
  }

  static tokenInvalid(): AppError {
    return new AppError('Invalid token', 401, ErrorCodes.TOKEN_INVALID);
  }
}

// Async handler wrapper to avoid try-catch in every controller
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error response interface
interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: Record<string, unknown>;
  stack?: string;
  requestId?: string;
  timestamp: string;
}

// Handle specific error types
const handleCastError = (err: Error & { path?: string; value?: unknown }): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, ErrorCodes.INVALID_FORMAT);
};

const handleDuplicateKeyError = (err: Error & { keyValue?: Record<string, unknown> }): AppError => {
  const value = err.keyValue ? Object.values(err.keyValue).join(', ') : 'unknown';
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400, ErrorCodes.DB_DUPLICATE_KEY);
};

const handleValidationError = (err: Error & { errors?: Record<string, { message: string }> }): AppError => {
  const errors = err.errors ? Object.values(err.errors).map((el) => el.message) : [];
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR);
};

const handleJWTError = (): AppError => {
  return AppError.tokenInvalid();
};

const handleJWTExpiredError = (): AppError => {
  return AppError.tokenExpired();
};

// Send error response in development
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  const response: ErrorResponse = {
    success: false,
    error: err.message,
    errorCode: err.errorCode,
    details: err.details,
    stack: err.stack,
    requestId: (req as Request & { requestId?: string }).requestId,
    timestamp: err.timestamp.toISOString(),
  };

  res.status(err.statusCode).json(response);
};

// Send error response in production
const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: ErrorResponse = {
      success: false,
      error: err.message,
      errorCode: err.errorCode,
      requestId: (req as Request & { requestId?: string }).requestId,
      timestamp: new Date().toISOString(),
    };

    res.status(err.statusCode).json(response);
  } else {
    // Programming or unknown error: don't leak details
    console.error('UNHANDLED ERROR:', err);

    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again later.',
      errorCode: ErrorCodes.INTERNAL_ERROR,
      requestId: (req as Request & { requestId?: string }).requestId,
      timestamp: new Date().toISOString(),
    });
  }
};

// Global error handling middleware
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = err as AppError;

  // Set defaults if not AppError
  if (!(err instanceof AppError)) {
    error = new AppError(
      err.message || 'Internal server error',
      (err as Error & { statusCode?: number }).statusCode || 500,
      ErrorCodes.INTERNAL_ERROR
    );
  }

  // Handle specific error types
  if (err.name === 'CastError') {
    error = handleCastError(err as Error & { path?: string; value?: unknown });
  }
  if ((err as Error & { code?: number }).code === 11000) {
    error = handleDuplicateKeyError(err as Error & { keyValue?: Record<string, unknown> });
  }
  if (err.name === 'ValidationError') {
    error = handleValidationError(err as Error & { errors?: Record<string, { message: string }> });
  }
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Log error
  const logger = (req as Request & { logger?: { error: (msg: string, meta?: object) => void } }).logger;
  if (logger) {
    logger.error('Request error', {
      error: error.message,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      stack: error.stack,
      path: req.path,
      method: req.method,
      requestId: (req as Request & { requestId?: string }).requestId,
    });
  }

  // Send response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (
  reason: Error,
  promise: Promise<unknown>
): void => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
};

// Handle uncaught exceptions
export const handleUncaughtException = (error: Error): void => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(error.name, error.message);
  console.error(error.stack);
  process.exit(1);
};

// Legacy helper for backward compatibility
export const handleError = (error: unknown): { message: string; statusCode: number } => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    message: 'Internal Server Error',
    statusCode: 500,
  };
};

export default {
  AppError,
  ErrorCodes,
  asyncHandler,
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  handleError,
};
