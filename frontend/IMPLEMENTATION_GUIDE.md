# CyberAwareSim - Complete Implementation Guide

This guide walks you through setting up the entire MERN stack platform from scratch.

## 📋 Table of Contents

1. [Complete Setup Instructions](#complete-setup-instructions)
2. [Project Architecture](#project-architecture)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Frontend Components](#frontend-components)
6. [Deployment Guide](#deployment-guide)
7. [Testing Guide](#testing-guide)

## Complete Setup Instructions

### Step 1: Prerequisites

Ensure you have:
- Node.js 16+ ([Download](https://nodejs.org/))
- npm or pnpm (included with Node.js)
- Git
- MongoDB Atlas account ([Create Free](https://www.mongodb.com/cloud/atlas))
- Code editor (VS Code recommended)

### Step 2: Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd cyberaware-sim

# Install frontend dependencies
npm install
# or
pnpm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 3: MongoDB Setup

1. **Create MongoDB Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up with email
   - Create free cluster

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password

3. **Connection String Format**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/cyberaware?retryWrites=true&w=majority
   ```

### Step 4: Environment Configuration

**Create frontend .env.local:**
```bash
# In project root
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF
```

**Create backend .env:**
```bash
# In server directory
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberaware?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_here_change_in_production_to_random_string
JWT_EXPIRE=24h
NODE_ENV=development
CLIENT_URL=http://localhost:3000
EOF
```

### Step 5: Initialize Database

```bash
# In server directory
npm run seed

# This creates:
# - 1 super admin user
# - 2 sample companies with admins
# - 16 employees
# - 6 campaigns
# - Sample simulation results
```

### Step 6: Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### Step 7: Access Application

- **Frontend**: http://localhost:3000
- **Backend Health Check**: http://localhost:5000/health
- **Login Email**: admin@cyberaware.com
- **Login Password**: password123

## Project Architecture

### Folder Structure Deep Dive

```
Frontend (Next.js App)
├── app/
│   ├── (auth)/                    # Auth route group
│   │   ├── login/page.tsx         # Login form
│   │   └── register/page.tsx      # Registration form
│   ├── dashboard/                 # Protected routes
│   │   ├── page.tsx               # Dashboard home
│   │   ├── leaderboard/           # Leaderboard
│   │   ├── analytics/             # Analytics
│   │   ├── campaigns/             # Campaign management
│   │   ├── layout.tsx             # Dashboard layout wrapper
│   │   └── settings/              # User settings
│   ├── context/                   # React Context
│   │   └── authContext.tsx        # Auth state & logic
│   ├── page.tsx                   # Landing page
│   └── layout.tsx                 # Root layout
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── dashboard/                 # Custom components
│       ├── sidebar.tsx            # Navigation
│       └── header.tsx             # Top bar
├── .env.local                     # Environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.ts

Backend (Express API)
├── models/                        # MongoDB schemas
│   ├── User.js                    # User collection
│   ├── Company.js                 # Company collection
│   ├── Campaign.js                # Campaign collection
│   ├── SimulationResult.js        # Results collection
│   ├── Leaderboard.js             # Leaderboard collection
│   └── ContactMessage.js          # Contact submissions
├── controllers/                   # Business logic
│   ├── authController.js          # Auth handlers
│   ├── companyController.js       # Company handlers
│   ├── campaignController.js      # Campaign handlers
│   ├── analyticsController.js     # Analytics handlers
│   ├── leaderboardController.js   # Leaderboard handlers
│   └── contactController.js       # Contact handlers
├── routes/                        # API endpoints
│   ├── auth.js                    # /api/auth/*
│   ├── company.js                 # /api/companies/*
│   ├── campaign.js                # /api/campaigns/*
│   ├── analytics.js               # /api/analytics/*
│   ├── leaderboard.js             # /api/leaderboard/*
│   └── contact.js                 # /api/contact/*
├── middleware/
│   └── auth.js                    # JWT verification
├── config/
│   └── database.js                # MongoDB connection
├── utils/
│   ├── jwt.js                     # Token utilities
│   ├── errorHandler.js            # Error responses
│   └── validators.js              # Input validation
├── scripts/
│   └── seedData.js                # Database seeding
├── server.js                      # Express app setup
├── .env                           # Environment variables
└── package.json
```

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  passwordHash: String (bcrypt),
  role: String, // "super_admin", "admin", "employee"
  companyId: ObjectId,
  department: String,
  points: Number,
  badge: String, // "novice", "aware", "expert", "guardian"
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Company Collection
```javascript
{
  _id: ObjectId,
  companyName: String (unique),
  industry: String,
  adminId: ObjectId,
  employeeCount: Number,
  totalCampaigns: Number,
  averagePhishingClickRate: Number,
  subscriptionPlan: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Campaign Collection
```javascript
{
  _id: ObjectId,
  campaignName: String,
  type: String, // "phishing", "smishing", "vishing"
  description: String,
  createdBy: ObjectId,
  companyId: ObjectId,
  status: String,
  targetDepartments: [String],
  targetUsers: [ObjectId],
  totalParticipants: Number,
  emailOpened: Number,
  linkClicked: Number,
  credentialsSubmitted: Number,
  reportedPhishing: Number,
  startDate: Date,
  endDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### SimulationResult Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  campaignId: ObjectId,
  companyId: ObjectId,
  emailOpened: Boolean,
  linkClicked: Boolean,
  credentialsSubmitted: Boolean,
  reportedPhishing: Boolean,
  result: String, // "safe", "clicked", "compromised", "reported"
  points: Number,
  timeSpent: Number,
  timestamp: Date,
  createdAt: Date
}
```

### Leaderboard Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  companyId: ObjectId,
  department: String,
  score: Number,
  rank: Number,
  totalSimulations: Number,
  correctResponses: Number,
  averageScore: Number,
  badge: String,
  lastUpdated: Date,
  createdAt: Date
}
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "employee"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "employee"
    },
    "token": "eyJhbGc..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@cyberaware.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "token": "eyJhbGc..."
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...

Response (200):
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {...}
  }
}
```

### Campaign Endpoints

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer token
Content-Type: application/json

{
  "campaignName": "Phishing Campaign #1",
  "type": "phishing",
  "description": "Test phishing campaign",
  "companyId": "...",
  "targetDepartments": ["HR", "Finance"]
}
```

#### Get Company Campaigns
```http
GET /api/campaigns/company/:companyId?status=active
Authorization: Bearer token
```

### Analytics Endpoints

#### Record Simulation Result
```http
POST /api/analytics/simulation
Authorization: Bearer token

{
  "userId": "...",
  "campaignId": "...",
  "companyId": "...",
  "emailOpened": true,
  "linkClicked": false,
  "credentialsSubmitted": false,
  "reportedPhishing": true
}
```

#### Get Campaign Analytics
```http
GET /api/analytics/campaign/:campaignId
Authorization: Bearer token
```

### Leaderboard Endpoints

#### Get Company Leaderboard
```http
GET /api/leaderboard/company/:companyId?department=HR
Authorization: Bearer token
```

## Frontend Components

### Auth Context Usage

```typescript
import { useAuth } from '@/app/context/authContext';

function MyComponent() {
  const { state, login, logout } = useAuth();
  
  if (!state.isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      Welcome, {state.user?.name}!
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Routes

Routes under `/dashboard` are automatically protected by the `DashboardLayout` component which redirects unauthenticated users to `/login`.

### Dashboard Components

**Sidebar Component:**
- Navigation menu
- Collapsible on mobile
- Role-based menu items
- Active route highlighting

**Header Component:**
- User info display
- Theme toggle (dark/light mode)
- Notifications bell
- Logout button

## Deployment Guide

### Frontend Deployment (Vercel)

**Option 1: Git Integration (Recommended)**
1. Push code to GitHub/GitLab
2. Go to https://vercel.com
3. Click "New Project"
4. Import your repository
5. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-api-domain.com`
6. Deploy!

**Option 2: CLI Deployment**
```bash
npm install -g vercel
vercel login
vercel
```

### Backend Deployment (Heroku)

```bash
# Login to Heroku
heroku login

# Create app
heroku create cyberaware-api

# Set environment variables
heroku config:set PORT=5000
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your_secret_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Environment Variables for Production

**Frontend (Vercel Settings):**
```
NEXT_PUBLIC_API_URL=https://cyberaware-api.herokuapp.com
```

**Backend (Heroku Config):**
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cyberaware
JWT_SECRET=very-long-random-secret-key
JWT_EXPIRE=24h
NODE_ENV=production
CLIENT_URL=https://cyberaware.vercel.app
```

## Testing Guide

### Manual Testing

**Test Login:**
1. Go to http://localhost:3000/login
2. Enter: admin@cyberaware.com / password123
3. Should redirect to /dashboard

**Test Dashboard:**
1. After login, verify sidebar loads
2. Check all navigation links work
3. Verify user info displays in header

**Test API Directly:**
```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyberaware.com","password":"password123"}'

# Test protected route
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Browser DevTools Testing

1. **Network Tab**
   - Check API response times
   - Verify request/response payloads
   - Check for CORS errors

2. **Console Tab**
   - Check for JavaScript errors
   - Verify no 404s

3. **Storage Tab**
   - Check localStorage for token
   - Verify user data stored

## Troubleshooting

### "Cannot GET /api/auth/me"
- Backend is not running
- API URL in .env.local is incorrect
- CORS not configured properly

### "MongoDB connection error"
- Check MONGODB_URI in server/.env
- Verify IP whitelist in MongoDB Atlas
- Ensure database name matches

### "CORS error"
- Backend needs CORS enabled
- Check CLIENT_URL matches frontend URL
- Restart backend after changing .env

### Token not working
- Check token expiration
- Verify JWT_SECRET matches
- Clear localStorage and re-login

## Production Checklist

- [ ] Update JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB Atlas IP whitelist
- [ ] Enable HTTPS on frontend
- [ ] Set up email notifications
- [ ] Configure backup strategy
- [ ] Set up error tracking (Sentry)
- [ ] Add SSL certificate
- [ ] Configure CDN if needed
- [ ] Set up monitoring and alerts
- [ ] Test all user flows
- [ ] Performance optimization
- [ ] Security headers configured
- [ ] Rate limiting enabled

## Next Steps

1. **Customize Branding**
   - Update logo and company name
   - Modify color scheme
   - Update email templates

2. **Add Features**
   - Email notifications
   - Real-time updates with WebSocket
   - Advanced reporting
   - Custom training content

3. **Optimize Performance**
   - Add caching
   - Optimize database queries
   - Implement pagination
   - Compress assets

4. **Enhance Security**
   - Add 2FA authentication
   - Implement rate limiting
   - Add request validation
   - Set security headers

5. **Scale Infrastructure**
   - Load balancing
   - Database replication
   - CDN setup
   - Horizontal scaling

---

For detailed documentation, see:
- [README.md](./README.md) - Project overview
- [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) - Frontend details
- [server/README.md](./server/README.md) - Backend details
