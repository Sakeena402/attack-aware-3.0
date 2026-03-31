// import express, { Express, Request, Response } from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { connectDB, disconnectDB } from './src/config/database';
// import authRouter from './src/routes/auth';
// import campaignRouter from './src/routes/campaign';
// import analyticsRouter from './src/routes/analytics';
// import companyRouter from './src/routes/company';
// import leaderboardRouter from './src/routes/leaderboard';
// import contactRouter from './src/routes/contact';
// import 'dotenv/config';
// dotenv.config();

// const app: Express = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:3000',
//   credentials: true,
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Health check
// app.get('/health', (req: Request, res: Response) => {
//   res.json({ status: 'OK', message: 'Server is running' });
// });

// // API Routes
// app.use('/api/auth', authRouter);
// app.use('/api/campaigns', campaignRouter);
// app.use('/api/analytics', analyticsRouter);
// app.use('/api/companies', companyRouter);
// app.use('/api/leaderboard', leaderboardRouter);
// app.use('/api/contact', contactRouter);

// // 404 Handler
// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     error: 'Route not found',
//   });
// });

// // Start Server
// const startServer = async (): Promise<void> => {
//   try {
//     await connectDB();
//     app.listen(PORT, () => {
//       console.log(`[v0] Server running on port ${PORT}`);
//       console.log(`[v0] Environment: ${process.env.NODE_ENV || 'development'}`);
//     });
//   } catch (error) {
//     console.error('[v0] Failed to start server:', error);
//     process.exit(1);
//   }
// };

// // Graceful shutdown
// process.on('SIGTERM', async () => {
//   console.log('[v0] SIGTERM signal received: closing HTTP server');
//   await disconnectDB();
//   process.exit(0);
// });

// process.on('SIGINT', async () => {
//   console.log('[v0] SIGINT signal received: closing HTTP server');
//   await disconnectDB();
//   process.exit(0);
// });

// startServer();


import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import { connectDB, disconnectDB } from './src/config/database';
import authRouter from './src/routes/auth';
import campaignRouter from './src/routes/campaign';
import analyticsRouter from './src/routes/analytics';
import companyRouter from './src/routes/company';
import leaderboardRouter from './src/routes/leaderboard';
import contactRouter from './src/routes/contact';
import employeesRouter from './src/routes/employees';
import 'dotenv/config';
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/companies', companyRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/contact', contactRouter);
app.use('/api/employees', employeesRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start Server
const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[v0] Server running on port ${PORT}`);
      console.log(`[v0] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('[v0] Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[v0] SIGTERM signal received: closing HTTP server');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[v0] SIGINT signal received: closing HTTP server');
  await disconnectDB();
  process.exit(0);
});

startServer();
