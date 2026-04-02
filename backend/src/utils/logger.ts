import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp, requestId, userId, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  
  if (requestId) {
    msg += ` [${requestId}]`;
  }
  
  if (userId) {
    msg += ` [User: ${userId}]`;
  }
  
  msg += `: ${message}`;
  
  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }
  
  return msg;
});

// Custom log format for files (JSON)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json()
);

// Log levels with colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'attack-aware-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
  
  // Error log file
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    })
  );
  
  // Combined log file
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
  
  // HTTP access log
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

// Helper methods for structured logging
export const logRequest = (
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  requestId: string,
  userId?: string
): void => {
  logger.http('API Request', {
    method,
    path,
    statusCode,
    responseTime: `${responseTime}ms`,
    requestId,
    userId,
  });
};

export const logAuth = (
  action: 'login' | 'logout' | 'register' | 'refresh' | 'failed_login',
  userId: string | null,
  email: string,
  success: boolean,
  requestId: string,
  reason?: string
): void => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Auth: ${action}`, {
    action,
    userId,
    email,
    success,
    reason,
    requestId,
  });
};

export const logCampaign = (
  action: 'create' | 'launch' | 'pause' | 'complete' | 'delete',
  campaignId: string,
  campaignName: string,
  userId: string,
  requestId: string,
  details?: Record<string, unknown>
): void => {
  logger.info(`Campaign: ${action}`, {
    action,
    campaignId,
    campaignName,
    userId,
    requestId,
    ...details,
  });
};

export const logTwilio = (
  action: 'sms_sent' | 'sms_delivered' | 'sms_failed' | 'call_initiated' | 'call_completed' | 'call_failed',
  messageSid: string | null,
  callSid: string | null,
  userId: string,
  campaignId: string,
  requestId: string,
  error?: string
): void => {
  const level = action.includes('failed') ? 'error' : 'info';
  logger.log(level, `Twilio: ${action}`, {
    action,
    messageSid,
    callSid,
    userId,
    campaignId,
    requestId,
    error,
  });
};

export const logSimulation = (
  action: 'click' | 'submit' | 'report' | 'view',
  simulationId: string,
  userId: string,
  campaignId: string,
  requestId: string,
  details?: Record<string, unknown>
): void => {
  logger.info(`Simulation: ${action}`, {
    action,
    simulationId,
    userId,
    campaignId,
    requestId,
    ...details,
  });
};

export const logSecurity = (
  event: 'rate_limit' | 'invalid_token' | 'unauthorized_access' | 'suspicious_activity',
  ip: string,
  path: string,
  requestId: string,
  details?: Record<string, unknown>
): void => {
  logger.warn(`Security: ${event}`, {
    event,
    ip,
    path,
    requestId,
    ...details,
  });
};

export const logDatabase = (
  action: 'connect' | 'disconnect' | 'error' | 'query_slow',
  details?: Record<string, unknown>
): void => {
  const level = action === 'error' ? 'error' : 'info';
  logger.log(level, `Database: ${action}`, details);
};

export const logError = (
  error: Error,
  requestId?: string,
  userId?: string,
  context?: Record<string, unknown>
): void => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    requestId,
    userId,
    ...context,
  });
};

export default logger;
