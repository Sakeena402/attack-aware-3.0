# Backend TypeScript Migration - Complete Guide

## Overview

The backend server has been successfully migrated from JavaScript to TypeScript. All code is now fully typed and production-ready with improved type safety, better IDE support, and enhanced maintainability.

## Directory Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.ts           # MongoDB connection config
│   ├── controllers/
│   │   ├── authController.ts     # Authentication logic
│   │   ├── campaignController.ts # Campaign management
│   │   └── analyticsController.ts # Analytics logic
│   ├── middleware/
│   │   └── auth.ts               # JWT authentication & authorization
│   ├── models/
│   │   ├── User.ts               # User schema
│   │   ├── Company.ts            # Company schema
│   │   ├── Campaign.ts           # Campaign schema
│   │   ├── SimulationResult.ts   # Simulation results schema
│   │   ├── Leaderboard.ts        # Leaderboard schema
│   │   └── ContactMessage.ts     # Contact messages schema
│   ├── routes/
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── campaign.ts           # Campaign endpoints
│   │   └── analytics.ts          # Analytics endpoints
│   ├── scripts/
│   │   └── seedData.ts           # Database seeding script
│   ├── types/
│   │   └── index.ts              # Type definitions
│   ├── utils/
│   │   ├── jwt.ts                # JWT token management
│   │   ├── validators.ts         # Input validation
│   │   └── errorHandler.ts       # Error handling
│   └── server.ts                 # Main Express server
├── dist/                         # Compiled JavaScript output
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
└── TYPESCRIPT_MIGRATION.md       # This file
```

## Key Features

### Type Safety
- Fully typed Express Request/Response objects
- Custom `AuthRequest` interface for authenticated routes
- Comprehensive interface definitions for all data models
- Type-safe database operations with Mongoose

### Database Models
All MongoDB models are properly typed with Mongoose schemas:
- **User**: Authentication, roles, departments, points
- **Company**: Multi-tenant support
- **Campaign**: Simulation campaigns (phishing/smishing/vishing)
- **SimulationResult**: Detailed response tracking
- **Leaderboard**: Department-based rankings
- **ContactMessage**: Lead capture form submissions

### Authentication
- JWT-based authentication with 24-hour token expiry
- bcryptjs password hashing
- Role-based access control (Super Admin, Admin, Employee)
- Middleware for route protection

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user (authenticated)

#### Campaigns
- `POST /api/campaigns` - Create campaign (admin only)
- `GET /api/campaigns` - Get company campaigns
- `GET /api/campaigns/:id` - Get specific campaign
- `PATCH /api/campaigns/:id` - Update campaign (admin only)
- `DELETE /api/campaigns/:id` - Delete campaign (admin only)

#### Analytics
- `GET /api/analytics/company` - Get company analytics
- `GET /api/analytics/global` - Get global analytics (super admin only)

## Development Setup

### Prerequisites
- Node.js 16+ and npm/pnpm
- MongoDB (Atlas or local)
- TypeScript knowledge

### Installation

1. **Install dependencies:**
```bash
cd server
pnpm install
```

2. **Create .env file:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberawaresim
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h
PORT=5000
NODE_ENV=development
```

3. **Build TypeScript:**
```bash
pnpm run build
```

4. **Seed database:**
```bash
pnpm run seed
```

5. **Start development server:**
```bash
pnpm run dev
```

The server will run at `http://localhost:5000`

## Scripts

- `pnpm run build` - Compile TypeScript to JavaScript in dist/
- `pnpm run dev` - Run with hot reload using ts-node
- `pnpm run start` - Run compiled production build
- `pnpm run seed` - Seed database with sample data

## TypeScript Configuration

The `tsconfig.json` includes:
- ES2020 target with strict type checking
- Source maps for debugging
- Declaration files for type exports
- Strict null checks and property initialization
- No unused variables or parameters

## Type Definitions

All types are defined in `src/types/index.ts`:
- User roles: `UserRole` (super_admin | admin | employee)
- Campaign types: `CampaignType` (phishing | smishing | vishing)
- Campaign status: `CampaignStatus` (draft | active | completed | paused)
- API responses: `ApiResponse<T>` for consistent response structure
- Request bodies: `LoginRequest`, `RegisterRequest`
- Tokens: `JwtPayload` for token data

## Error Handling

All errors are handled consistently:
- `AppError` class for application errors with status codes
- Try-catch blocks in all controllers
- Meaningful error messages
- Proper HTTP status codes

## Security Features

- JWT tokens with expiration
- bcryptjs password hashing (10 rounds)
- Input validation for all endpoints
- Role-based authorization
- MongoDB injection prevention via Mongoose
- CORS configuration
- Request body size limits

## Production Deployment

1. **Build the project:**
```bash
pnpm run build
```

2. **Set environment variables** on your hosting platform:
   - MONGODB_URI
   - JWT_SECRET (use a strong random value)
   - PORT (optional, defaults to 5000)
   - NODE_ENV=production

3. **Deploy:**
```bash
pnpm run start
```

## Debugging

Enable detailed logging by setting `NODE_ENV=development`. All server operations log with `[v0]` prefix for easy filtering.

## Migration Notes

All JavaScript files have been converted to TypeScript with:
- Proper import/export syntax for ES modules
- Type annotations on all functions and variables
- Mongoose type definitions
- Express middleware typing
- Error handling with typed catch blocks

## Future Enhancements

- Add request validation middleware (joi/yup)
- Implement rate limiting
- Add comprehensive logging system
- Add API documentation (Swagger)
- Add unit and integration tests
- Implement caching strategies
- Add monitoring and analytics
