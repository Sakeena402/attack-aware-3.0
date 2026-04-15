// import express, { Express, Request, Response } from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import morgan from 'morgan';

// // Load environment variables first
// dotenv.config();

// // Import utilities
// import { connectDB, disconnectDB } from './src/config/database';
// import logger, { logDatabase } from './src/utils/logger';
// import {
//   globalErrorHandler,
//   handleUnhandledRejection,
//   handleUncaughtException,
//   AppError,
//   ErrorCodes,
// } from './src/utils/errorHandler';

// // Import security middleware
// import {
//   requestIdMiddleware,
//   requestTimingMiddleware,
//   helmetMiddleware,
//   xssProtection,
//   mongoSanitizeMiddleware,
//   generalRateLimiter,
//   authRateLimiter,
//   apiRateLimiter,
//   webhookRateLimiter,
//   additionalSecurityHeaders,
// } from './src/middleware/security';

// // Import routes
// import authRouter from './src/routes/auth';
// import campaignRouter from './src/routes/campaign';
// import analyticsRouter from './src/routes/analytics';
// import companyRouter from './src/routes/company';
// import leaderboardRouter from './src/routes/leaderboard';
// import contactRouter from './src/routes/contact';
// import employeesRouter from './src/routes/employees';
// import webhooksRouter from './src/routes/webhooks';
// import trackingRouter from './src/routes/tracking';
// import simulationsRouter from './src/routes/simulations';

// import cookieParser from 'cookie-parser';


// // Handle uncaught exceptions
// process.on('uncaughtException', handleUncaughtException);

// const app: Express = express();
// app.use(cookieParser());
// const PORT = process.env.PORT || 5000;
// const isProduction = process.env.NODE_ENV === 'production';

// // ============================================
// // Trust proxy (for rate limiting behind reverse proxy)
// // ============================================
// if (isProduction) {
//   app.set('trust proxy', 1);
// }

// // ============================================
// // Security Middleware (applied first)
// // ============================================
// app.use(requestIdMiddleware);
// app.use(requestTimingMiddleware);
// app.use(helmetMiddleware);
// app.use(additionalSecurityHeaders);

// // ============================================
// // CORS Configuration
// // ============================================
// const corsOptions = {
//   origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
//     const allowedOrigins = [
//       process.env.CLIENT_URL || 'http://localhost:3000',
//       'http://localhost:3000',
//       'http://localhost:3001',
//     ];
    
//     // Allow requests with no origin (mobile apps, curl, etc.)
//     if (!origin) {
//       callback(null, true);
//       return;
//     }
    
//     if (allowedOrigins.includes(origin) || !isProduction) {
//       callback(null, true);
//     } else {
//       logger.warn('CORS blocked', { origin });
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
//   exposedHeaders: ['X-Request-ID'],
//   maxAge: 86400, // 24 hours
// };

// app.use(cors(corsOptions));

// // ============================================
// // Body Parsing
// // ============================================
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // ============================================
// // Data Sanitization
// // ============================================
// app.use(xssProtection);
// app.use(mongoSanitizeMiddleware);

// // ============================================
// // HTTP Request Logging
// // ============================================
// const morganFormat = isProduction ? 'combined' : 'dev';
// app.use(
//   morgan(morganFormat, {
//     stream: {
//       write: (message: string) => {
//         logger.http(message.trim());
//       },
//     },
//     skip: (req) => req.url === '/health', // Skip health check logs
//   })
// );

// // ============================================
// // Rate Limiting
// // ============================================
// app.use('/api/', generalRateLimiter);
// app.use('/api/auth/login', authRateLimiter);
// app.use('/api/auth/register', authRateLimiter);
// app.use('/api/webhooks', webhookRateLimiter);

// // ============================================
// // Health Check (no rate limiting)
// // ============================================
// app.get('/health', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     status: 'healthy',
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || 'development',
//     requestId: req.requestId,
//   });
// });

// // Detailed health check for monitoring
// app.get('/health/detailed', async (req: Request, res: Response) => {
//   try {
//     const mongoose = await import('mongoose');
//     const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
//     res.json({
//       success: true,
//       status: 'healthy',
//       timestamp: new Date().toISOString(),
//       requestId: req.requestId,
//       services: {
//         database: {
//           status: dbStatus,
//           type: 'MongoDB',
//         },
//         api: {
//           status: 'running',
//           version: process.env.npm_package_version || '1.0.0',
//         },
//       },
//       environment: process.env.NODE_ENV || 'development',
//       uptime: process.uptime(),
//       memory: process.memoryUsage(),
//     });
//   } catch (error) {
//     res.status(503).json({
//       success: false,
//       status: 'unhealthy',
//       error: 'Health check failed',
//       requestId: req.requestId,
//     });
//   }
// });

// // ============================================
// // API Routes
// // ============================================
// app.use('/api/auth', authRouter);
// app.use('/api/campaigns', apiRateLimiter, campaignRouter);
// app.use('/api/analytics', apiRateLimiter, analyticsRouter);
// app.use('/api/companies', apiRateLimiter, companyRouter);
// app.use('/api/leaderboard', apiRateLimiter, leaderboardRouter);
// app.use('/api/contact', apiRateLimiter, contactRouter);
// app.use('/api/employees', apiRateLimiter, employeesRouter);
// app.use('/api/webhooks', webhooksRouter);
// app.use('/api/track', trackingRouter);
// app.use('/api/simulations', apiRateLimiter, simulationsRouter);

// // ============================================
// // 404 Handler
// // ============================================
// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     error: `Route ${req.method} ${req.path} not found`,
//     errorCode: ErrorCodes.NOT_FOUND,
//     requestId: req.requestId,
//     timestamp: new Date().toISOString(),
//   });
// });

// // ============================================
// // Global Error Handler (must be last)
// // ============================================
// app.use(globalErrorHandler);

// // ============================================
// // Server Startup
// // ============================================
// const startServer = async (): Promise<void> => {
//   try {
//     // Connect to database
//     logDatabase('connect', { uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//<credentials>@') });
//     await connectDB();
//     logDatabase('connect', { status: 'success' });

//     // Start server
//     const server = app.listen(PORT, () => {
//       logger.info('Server started', {
//         port: PORT,
//         environment: process.env.NODE_ENV || 'development',
//         nodeVersion: process.version,
//       });
//     });

//     // Handle unhandled promise rejections
//     process.on('unhandledRejection', (reason: Error, promise: Promise<unknown>) => {
//       handleUnhandledRejection(reason, promise);
//     });

//     // Graceful shutdown
//     const gracefulShutdown = async (signal: string): Promise<void> => {
//       logger.info(`${signal} received: starting graceful shutdown`);
      
//       server.close(async () => {
//         logger.info('HTTP server closed');
        
//         try {
//           await disconnectDB();
//           logDatabase('disconnect', { status: 'success' });
//           logger.info('Database connection closed');
//           process.exit(0);
//         } catch (error) {
//           logger.error('Error during shutdown', { error });
//           process.exit(1);
//         }
//       });

//       // Force close after 30 seconds
//       setTimeout(() => {
//         logger.error('Forced shutdown after timeout');
//         process.exit(1);
//       }, 30000);
//     };

//     process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
//     process.on('SIGINT', () => gracefulShutdown('SIGINT'));

//   } catch (error) {
//     logger.error('Failed to start server', {
//       error: error instanceof Error ? error.message : 'Unknown error',
//       stack: error instanceof Error ? error.stack : undefined,
//     });
//     process.exit(1);
//   }
// };

// startServer();

// export default app; 




import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

// Load environment variables first
dotenv.config();

// Import utilities
import { connectDB, disconnectDB } from './src/config/database.js';
import logger, { logDatabase } from './src/utils/logger.js';
import {
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  AppError,
  ErrorCodes,
} from './src/utils/errorHandler.js';

// Import security middleware
import {
  requestIdMiddleware,
  requestTimingMiddleware,
  helmetMiddleware,
  xssProtection,
  mongoSanitizeMiddleware,
  generalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  webhookRateLimiter,
  additionalSecurityHeaders,
} from './src/middleware/security.js';

// Import routes
import authRouter from './src/routes/auth.js';
import campaignRouter from './src/routes/campaign.js';
import analyticsRouter from './src/routes/analytics.js';
import companyRouter from './src/routes/company.js';
import leaderboardRouter from './src/routes/leaderboard.js';
import contactRouter from './src/routes/contact.js';
import employeesRouter from './src/routes/employees.js';
import webhooksRouter from './src/routes/webhooks.js';
import trackingRouter from './src/routes/tracking.js';
import simulationsRouter from './src/routes/simulations.js';
import superAdminRouter from './src/routes/super-admin.js';
import cookieParser from 'cookie-parser';
import settingsRoute from "./src/routes/settingsRoute.js";
import userRoutes from './src/routes/userRoutes.js';
// Add these two lines with your other routes:
import teamRoute from './src/routes/teamRoute.js';
import systemControlsRoute from './src/routes/systemControlsRoute.js';


// Handle uncaught exceptions
process.on('uncaughtException', handleUncaughtException);

const app: Express = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// Trust proxy (for rate limiting behind reverse proxy)
// ============================================
if (isProduction) {
  app.set('trust proxy', 1);
}

// ============================================
// Security Middleware (applied first)
// ============================================
app.use(requestIdMiddleware);
app.use(requestTimingMiddleware);
app.use(helmetMiddleware);
app.use(additionalSecurityHeaders);

// ============================================
// CORS Configuration
// ============================================
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Cookie'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
};

app.use(cookieParser());
app.use(cors(corsOptions));

// ============================================
// Body Parsing
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Data Sanitization
// ============================================
app.use(xssProtection);
app.use(mongoSanitizeMiddleware);

// ============================================
// HTTP Request Logging
// ============================================
const morganFormat = isProduction ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
    skip: (req) => req.url === '/health', // Skip health check logs
  })
);

// ============================================
// Rate Limiting
// ============================================
app.use('/api/', generalRateLimiter);
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/webhooks', webhookRateLimiter);

// ============================================
// Health Check (no rate limiting)
// ============================================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    requestId: req.requestId,
  });
});

// Detailed health check for monitoring
app.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const mongoose = await import('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      services: {
        database: {
          status: dbStatus,
          type: 'MongoDB',
        },
        api: {
          status: 'running',
          version: process.env.npm_package_version || '1.0.0',
        },
      },
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      requestId: req.requestId,
    });
  }
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRouter);
app.use('/api/super-admin', apiRateLimiter, superAdminRouter);
app.use('/api/campaigns', apiRateLimiter, campaignRouter);
app.use('/api/analytics', apiRateLimiter, analyticsRouter);
app.use('/api/companies', apiRateLimiter, companyRouter);
app.use('/api/leaderboard', apiRateLimiter, leaderboardRouter);
app.use('/api/contact', apiRateLimiter, contactRouter);
app.use('/api/employees', apiRateLimiter, employeesRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/track', trackingRouter);
app.use('/api/simulations', apiRateLimiter, simulationsRouter);
app.use('/api/settings', settingsRoute);
app.use('/api/users', userRoutes);
// Then register them:
app.use('/api/team', teamRoute);
app.use('/api/system-controls', systemControlsRoute);

// ============================================
// 404 Handler
// ============================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    errorCode: ErrorCodes.NOT_FOUND,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Global Error Handler (must be last)
// ============================================
app.use(globalErrorHandler);

// ============================================
// Server Startup
// ============================================
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    logDatabase('connect', { uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//<credentials>@') });
    await connectDB();
    logDatabase('connect', { status: 'success' });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: Error, promise: Promise<unknown>) => {
      handleUnhandledRejection(reason, promise);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received: starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await disconnectDB();
          logDatabase('disconnect', { status: 'success' });
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};


startServer();

export default app;
